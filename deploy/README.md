# Deploying Bluy (web) to your Hostinger VPS

The web app builds to a folder of plain static files (`dist/`). You upload that
folder to your VPS and let the web server serve it, with a small rule so the
app's internal links work. No Node.js needs to run on the server for this.

## 1. Build the site (on your PC)

```powershell
npm run build:web
```

This creates a `dist/` folder in the project. The thing you upload is the
**contents** of `dist/` (the `index.html`, `_expo/`, `assets/`, etc.) — not the
folder itself.

## 2. Put the files on the VPS

Pick the path that matches your VPS:

### A) VPS with a control panel (CyberPanel / hPanel / Apache / OpenLiteSpeed)
1. In the panel's **File Manager**, open your website's document root
   (usually `/home/<your-domain>/public_html`).
2. Upload everything inside `dist/` into that folder. (Tip: zip the contents of
   `dist/`, upload the zip, then "Extract" in the File Manager.)
3. Upload `deploy/.htaccess` into the **same** folder, next to `index.html`.

### B) Plain Nginx VPS (no panel)
1. Copy `dist/` contents to the server, e.g. with WinSCP/SFTP into `/var/www/bluy`,
   or from PowerShell:
   ```powershell
   scp -r dist/* user@YOUR_VPS_IP:/var/www/bluy/
   ```
2. Install the server block and reload (see the header of `nginx-bluy.conf` for
   the exact commands).

## 3. Point your domain
- Add a DNS **A record** for your domain → your VPS's public IP.
- (Panel users: create/attach the website for that domain first, then upload
  into its `public_html`.)

## 4. Turn on HTTPS
- Panel: use the built-in **SSL / Let's Encrypt** button for the domain.
- Plain Nginx: `sudo certbot --nginx -d your-domain.com -d www.your-domain.com`

## 5. Re-deploying after changes
Run `npm run build:web` again and re-upload the `dist/` contents (overwrite).
The `.htaccess` / Nginx config only needs to be set up once.

---
### Quick check it worked
Open your domain, go Home → a story → a chapter, then **refresh the page while on
a story URL**. If it still loads (no 404), the routing rule is working.
