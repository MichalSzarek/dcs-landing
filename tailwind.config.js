/** @type {import('tailwindcss').Config} */
// Same defaults the Play CDN used (it served 3.4.17), so moving to a compiled
// stylesheet changes how the pages are delivered, not how they look.
module.exports = {
  content: ["./*.html", "./partials/*.html"],
  theme: { extend: {} },
  plugins: []
};
