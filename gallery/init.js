//jshint browser: true, strict: false
//
// Usage: pluginUtils.load('gallery').then(function () {plugins.gallery.imageSelector = 'img';plugins.gallery.onActivate()})
//
if (typeof window.plugins !== "object") {
  window.plugins = {};
}
window.plugins.gallery = {
  name: "Gallery",
  active: true,
  imageSelector: 'img:not(.galleryItem)',
  getImages: function (node) {
    if (typeof node === 'undefined') {
      node = document;
    }
    return node.querySelectorAll(this.imageSelector);
  },
  addGallery: function (params) {
    var images, gal;
    images = this.getImages();
    if (images.length > 0) {
      gal = document.getElementById('gallery');
      if (gal === null) {
        gal = document.createElement('div');
        gal.id = "gallery";
        gal.style.display = "none";
        document.body.appendChild(gal);
      } else {
        gal.innerHTML = '';
      }
      Array.prototype.forEach.call(images, function (elmt, idx) {
        var a, img, icon;
        a = document.createElement('a');
        a.href = elmt.src;
        img = document.createElement('img');
        img.classList.add('galleryItem');
        img.src = elmt.src;
        a.appendChild(img);
        gal.appendChild(a);
        if (elmt.parentNode.querySelectorAll("[data-gallery]").length === 0) {
          icon = document.createElement('a');
          icon.style.position = 'fixed';
          icon.style.top   = '1em';
          icon.style.right = '1em';
          icon.innerHTML =
            '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="display: none">' +
            '<defs>' +
            '<symbol id="icon-eye" viewBox="0 0 1024 1024">' +
            '<title>eye</title>' +
            '<path class="path1" d="M512 192c-223.318 0-416.882 130.042-512 320 95.118 189.958 288.682 320 512 320 223.314 0 416.878-130.042 512-320-95.116-189.958-288.686-320-512-320zM764.45 361.704c60.162 38.374 111.142 89.774 149.434 150.296-38.292 60.522-89.274 111.922-149.436 150.298-75.594 48.216-162.89 73.702-252.448 73.702-89.56 0-176.856-25.486-252.45-73.704-60.16-38.372-111.14-89.772-149.434-150.296 38.292-60.524 89.274-111.924 149.434-150.296 3.918-2.5 7.876-4.922 11.858-7.3-9.958 27.328-15.408 56.822-15.408 87.596 0 141.384 114.616 256 256 256s256-114.616 256-256c0-30.774-5.45-60.268-15.408-87.598 3.98 2.378 7.938 4.802 11.858 7.302zM512 410c0 53.020-42.98 96-96 96s-96-42.98-96-96 42.98-96 96-96 96 42.98 96 96z" />' +
            '</symbol>' +
            '</defs>' +
            '</svg>' +
            '<svg style="height: 1em; width: 1em"><use xlink:href="#icon-eye"></use></svg>';
          icon.addEventListener('click', function () {
            var event = document.createEvent("MouseEvent");
            event.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
            a.dispatchEvent(event);
            //img.dispatchEvent(new MouseEvent('click', { 'view': window, 'bubbles': true, 'cancelable': true }));
          });
          if (elmt.nextElementSibling) {
            elmt.parentNode.insertBefore(icon, elmt.nextElementSibling);
          } else {
            elmt.parentNode.appendChild(icon);
          }
        }
      });
      window.baguetteBox.run('body', {
        captions: true,       // true|false - Display image captions
        buttons: 'auto',      // 'auto'|true|false - Display buttons
        async: false,         // true|false - Load files asynchronously
        preload: 2,           // [number] - How many files should be preloaded from current image
        animation: 'slideIn'  // 'slideIn'|'fadeIn'|false - Animation type
      });
    }
  },
  onAdd: {
    /**
     * Should return true if plugin applies on added subtree
     *
     * @param {DOMNode} node node of added subtree
     */
    condition: function (node) {
      return this.getImages(node).length > 0;
    },
    /**
     * Perform action on added subtree
     *
     * @param {DOMNode} node node of added subtree
     */
    action: function (node) {
      this.addGallery();
    }
  },
  onDelete: {
    condition: function (node) {
      return this.getImages(node).length > 0;
    },
    action: function (node) {
      this.addGallery();
    }
  },
  /**
   * Called when plugin is activated
   */
  onActivate: function () {
    this.addGallery();
  },
  /**
   * Called when plugin is deactivated
   */
  onDeactivate: function () {
  },
  listeners: {
    'load': function (params) {
      this.addGallery();
    }
  }
};
