# Wahika Café & Lounge website

A complete multi-page website with a built-in admin portal (CMS).

## What's inside

| Page | File |
|---|---|
| Home | `index.html` |
| About Us | `about.html` |
| Our Menu (today's dishes + full menu) | `menu.html` |
| Menu item detail | `menu-item.html?id=...` |
| Gallery | `gallery.html` |
| Our Experience | `experience.html` |
| Events & Offers | `events.html` |
| Contact | `contact.html` |
| Privacy Policy | `privacy.html` |
| Terms & Conditions | `terms.html` |
| 404 page | `404.html` |
| **Admin portal** | `admin/` (open `yoursite.com/admin/`) |

Every page is its own HTML file and links to all the others. A floating WhatsApp
button (+256 774 646 178) appears on every page; change the number in
Admin > Contact & business.

Other folders: `assets/` (CSS and JS), `images/` (photos), `data/content.json`
(the site's saved content), `api/` (optional PHP backend for live publishing).

## Deploying (cPanel / any PHP host)

1. Upload the zip to `public_html` and extract it so `index.html` sits in the web root.
2. Make these writable by the web server (usually permission 755, or 775 if saving fails):
   `data/`, `images/` (uploads go to `images/uploads/`), and `api/auth.php`.
3. Turn on HTTPS for the domain.
4. Open `/admin/`, sign in, and **change the password straight away**
   (Settings > Change password).

Default login: user `Wahika`, password `Wahika@2026`.

### Two modes (the admin shows which one it's in)

- **Live** (PHP found at `/api`): every save publishes to all visitors immediately.
  Photos you drag in are uploaded to `images/uploads/`. The last 20 versions are kept in `data/backups/`.
- **Browser-only** (no PHP, e.g. plain static hosting or opening files locally):
  edits are stored in your own browser and visitors do not see them. To publish,
  use Settings > Export content.json, then upload that file to `data/content.json`.
  Browser-only mode is not secure (the sign-in check runs in the browser), so use a PHP host for real use.

## Using the admin

- **Today's menu**: tick what's being served today and save. The Menu page then shows
  an "Available Today" section. Do this each morning; until you do, visitors see the
  full menu with a note.
- **Menu**: add, edit, reorder and delete items and categories. Price is optional.
- **Gallery**: drag many photos at once onto the drop box.
- **Events & offers**: post offers and events; untick "Published" to hide.
- **Page content**: edit the words on any page, show or hide whole sections, and set
  the Google title and description.
- **Site photos**: drag a new photo onto a box to replace a large photo.
- **Contact & business**: WhatsApp number, phone, email, social links, opening hours, map link.

## Notes

- Menu names and descriptions were written from the supplied food photos. Prices are blank on purpose; add them in the admin.
- Use real photos of Wahika's own dishes and premises when you have them.
- The privacy and terms pages are plain starter text; have them reviewed before relying on them.
- To add a brand-new page, copy any `.html` file and edit it (or ask your developer).
