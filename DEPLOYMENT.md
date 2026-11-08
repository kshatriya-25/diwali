# Deployment — diwali.orcans.in (Apache + Certbot)

A static site (HTML/CSS/JS, no build, no server process). Apache serves the files read-only.

**Safety rules this guide follows**

- **Nothing runs as root.** The site files belong to a dedicated, unprivileged `diwali` user. Apache workers run as `www-data` and can only *read* them. `sudo` is used only for the steps that need root by nature: the Apache config, the Apache modules and Certbot.
- **Other sites on this server are not touched.** We add one new vhost file and never edit shared config. We only ever `reload` Apache (graceful), never `restart`, and always run `configtest` before each reload.
- **Nothing private is served.** Apache returns `404` for `.git/`, dotfiles and repo-only files such as `*.md` and `*.json`.
- **Security headers:** strict CSP, HSTS, nosniff, no framing, and a locked-down Permissions-Policy. These were tested against the live page with zero CSP violations.

> Run every command as your normal admin user (one that has `sudo`), **not** in a root shell.
> If you are currently `root`, switch with `su - <your-admin-user>` first.

---

## 0. Pre-flight checks (read-only, safe)

```bash
# DNS must point at this server before Certbot can work
dig +short diwali.orcans.in          # should print this server's public IP
curl -s https://ifconfig.me; echo    # this server's public IP, to compare

# Apache is the web server here and is healthy
systemctl is-active apache2          # -> active
sudo apache2ctl configtest           # -> Syntax OK  (if not, STOP: fix existing config first)

# No existing vhost already claims this domain
sudo apache2ctl -S 2>/dev/null | grep -i diwali || echo "OK: domain not in use"

# Certbot with the Apache plugin is present
certbot --version || sudo apt-get install -y certbot python3-certbot-apache
```

---

## 1. Create an unprivileged deploy user

This user owns the files and runs `git`. It gets no sudo, no password and no SSH login.

```bash
sudo adduser --system --group --home /var/www/diwali --shell /usr/sbin/nologin diwali
```

---

## 2. Get the code (as the deploy user)

An earlier clone made as root at `/var/www/ankit/diwali` should not be served. Remove it once you have confirmed it is the throwaway clone:

```bash
ls -la /var/www/ankit/diwali            # look before deleting
sudo rm -rf /var/www/ankit/diwali
sudo rmdir /var/www/ankit 2>/dev/null || true
```

Clone over **HTTPS**, which needs no key for a public repo, as the `diwali` user:

```bash
sudo -u diwali git clone https://github.com/kshatriya-25/diwali.git /var/www/diwali/site
```

Lock down permissions. The deploy user can write, everyone else (including Apache) can only read:

```bash
sudo chown -R diwali:diwali /var/www/diwali
sudo find /var/www/diwali -type d -exec chmod 755 {} +
sudo find /var/www/diwali -type f -exec chmod 644 {} +

# sanity check: www-data can read but NOT write
sudo -u www-data test -r /var/www/diwali/site/index.html && echo "read OK"
sudo -u www-data test -w /var/www/diwali/site/index.html && echo "WRITABLE (bad)" || echo "not writable (good)"
```

---

## 3. Enable the Apache modules we need

These are standard modules. If they are already on, these commands do nothing.

```bash
sudo a2enmod headers alias dir
```

---

## 4. Create the vhost (HTTP first; Certbot adds HTTPS in step 6)

```bash
sudo tee /etc/apache2/sites-available/diwali.orcans.in.conf > /dev/null <<'EOF'
<VirtualHost *:80>
    ServerName diwali.orcans.in
    DocumentRoot /var/www/diwali/site

    ErrorLog  ${APACHE_LOG_DIR}/diwali.orcans.in-error.log
    CustomLog ${APACHE_LOG_DIR}/diwali.orcans.in-access.log combined

    <Directory /var/www/diwali/site>
        Options -Indexes -FollowSymLinks -ExecCGI -Includes
        AllowOverride None
        Require all granted

        # /ankit, /priya?from=arjun ... -> the single page app
        FallbackResource /index.html
    </Directory>

    # Never serve the git repo, dotfiles or repo-only files
    RedirectMatch 404 "(?i)/\.(?!well-known/)"
    RedirectMatch 404 "(?i)\.(md|json|mjs|lock|log|sh|bak|swp)$"

    # ---- Security headers ----
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "DENY"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
    Header always set Content-Security-Policy "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net 'sha256-4V1UclJClx9/FV6gHP29z3mTvSralDNQnI7ho0PBBtY='; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://cdn.jsdelivr.net; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
    # HSTS is only sent over HTTPS (Certbot copies this block into the SSL vhost)
    Header always set Strict-Transport-Security "max-age=31536000" "expr=%{HTTPS} == 'on'"

    # ---- Caching: HTML always fresh, assets for 1 hour ----
    <FilesMatch "\.html$">
        Header set Cache-Control "no-cache"
    </FilesMatch>
    <FilesMatch "\.(js|css)$">
        Header set Cache-Control "public, max-age=3600"
    </FilesMatch>
</VirtualHost>
EOF
```

Enable it. Apache is only reloaded if the whole config is valid:

```bash
sudo a2ensite diwali.orcans.in.conf
sudo apache2ctl configtest && sudo systemctl reload apache2
```

Quick HTTP check:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://diwali.orcans.in/          # 200
curl -s -o /dev/null -w "%{http_code}\n" http://diwali.orcans.in/ankit     # 200
curl -s -o /dev/null -w "%{http_code}\n" http://diwali.orcans.in/.git/HEAD # 404
```

---

## 5. Firewall (only if `ufw` is active)

```bash
sudo ufw status | grep -q "Status: active" && sudo ufw allow 'Apache Full' || echo "ufw not active, skipping"
```

---

## 6. HTTPS with Certbot

This asks for this one domain only and adds an HTTP→HTTPS redirect. Certbot creates `diwali.orcans.in-le-ssl.conf` and does not touch other vhosts.

```bash
sudo certbot --apache -d diwali.orcans.in --redirect
```

Then check:

```bash
sudo apache2ctl configtest
curl -s -o /dev/null -w "%{http_code}\n" http://diwali.orcans.in/            # 301
curl -s -o /dev/null -w "%{http_code}\n" https://diwali.orcans.in/ankit      # 200
curl -s -o /dev/null -w "%{http_code}\n" https://diwali.orcans.in/.git/HEAD  # 404
curl -s -o /dev/null -w "%{http_code}\n" https://diwali.orcans.in/DEPLOYMENT.md # 404
curl -sI https://diwali.orcans.in/ | grep -iE "strict-transport|content-security|x-frame|nosniff"

# auto-renewal works
sudo certbot renew --dry-run
```

Open `https://diwali.orcans.in/ankit?from=tealorca` in a browser. Strike the match and light the diya.

---

## 7. Updating the site later (no root needed)

```bash
sudo -u diwali git -C /var/www/diwali/site pull --ff-only
```

There is no Apache reload and no build. HTML is served with `no-cache`, so visitors get the new version on their next visit. JS and CSS refresh within an hour.

> **If you ever edit the `<script type="importmap">` block in `index.html`**, the CSP hash changes and the page will go blank.
> Get the new hash and replace the `sha256-...` value in **both** vhost files (`diwali.orcans.in.conf` and `diwali.orcans.in-le-ssl.conf`):
>
> ```bash
> python3 -c "import re,hashlib,base64;s=open('/var/www/diwali/site/index.html').read();m=re.search(r'<script type=\"importmap\">(.*?)</script>',s,re.S).group(1);print('sha256-'+base64.b64encode(hashlib.sha256(m.encode()).digest()).decode())"
> sudo apache2ctl configtest && sudo systemctl reload apache2
> ```

---

## 8. Rollback / removal

```bash
# take the site offline (other sites unaffected)
sudo a2dissite diwali.orcans.in.conf diwali.orcans.in-le-ssl.conf
sudo apache2ctl configtest && sudo systemctl reload apache2

# optional full cleanup
sudo certbot delete --cert-name diwali.orcans.in
sudo rm /etc/apache2/sites-available/diwali.orcans.in*.conf
sudo rm -rf /var/www/diwali
sudo deluser --system diwali
```

To roll back to an earlier version of the code instead:

```bash
sudo -u diwali git -C /var/www/diwali/site log --oneline -5
sudo -u diwali git -C /var/www/diwali/site checkout <commit>
```
