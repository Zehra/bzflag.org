(function () {
    'use strict';

    const KB_Keys = {
        tab:   9,
        enter: 13,
        esc:   27,
        space: 32,
        up:    38,
        down:  40,
        home:  36,
        end:   35,
    };

    const BREAKPOINTS = {
        sm: 576,
        md: 768,
        lg: 992,
        xl: 1200,
    };

    const BREAKPOINT_NAMES = Object.keys(BREAKPOINTS);

    /**
     * Get the 'respond-down' value of the current breakpoint.
     *
     * @returns {number}
     */
    function respondDownBreakpoint() {
        for (let i = 0; i < BREAKPOINT_NAMES.length; i++) {
            const name = BREAKPOINT_NAMES[i];
            const breakpoint = BREAKPOINTS[name];

            if (window.matchMedia('(max-width: ' + (breakpoint - 0.02) + 'px)').matches) {
                return breakpoint - 0.02;
            }
        }

        return -1;
    }

    /**
     * Detect the OS the browser claims to be.
     *
     * @returns {string}
     */
    function getOS() {
        // Source: https://stackoverflow.com/a/38241481
        // Author: Vladyslav Turak (https://stackoverflow.com/users/4815056/vladyslav-turak)
        // License: http://creativecommons.org/licenses/by-sa/3.0/
        const userAgent = window.navigator.userAgent,
            platform = window.navigator.platform,
            macosPlatforms = ['Macintosh', 'MacIntel'],
            windowsPlatforms = ['Win32', 'Win64', 'Windows'],
            iosPlatforms = ['iPhone', 'iPad', 'iPod'];

        if (macosPlatforms.indexOf(platform) !== -1) {
            return 'macos';
        } else if (iosPlatforms.indexOf(platform) !== -1) {
            return 'ios';
        } else if (windowsPlatforms.indexOf(platform) !== -1) {
            return 'windows';
        } else if (/Android/.test(userAgent)) {
            return 'android';
        } else if (/Linux/.test(platform)) {
            return 'linux';
        }

        return 'unknown';
    }

    /**
     * Replace a class in the root `<html>` element.
     *
     * @param {string|RegExp} find
     * @param {string} replace
     */
    function replaceDomClass(find, replace) {
        document.documentElement.className = document.documentElement.className.replace(find, '') + ' ' + replace + ' ';
    }

    /**
     * Toggle a string boolean on an element.
     *
     * @param {Element} element
     * @param {string} attribute
     */
    function toggleBooleanString(element, attribute) {
        const value = element.getAttribute(attribute);

        element.setAttribute(attribute, value === 'true' ? 'false' : 'true');
    }

    // Add some helper classes to the DOM for some fancier features
    //
    //   - Detect the OS from CSS
    //   - Detect JS usage from CSS

    replaceDomClass('os-unknown', 'os-' + getOS());
    replaceDomClass('no-js', 'js');

    //
    // Mobile menu support
    //

    const menuToggle = document.querySelector('#menu-toggle');

    if (menuToggle) {
        menuToggle.addEventListener('click', function () {
            toggleBooleanString(this, 'aria-expanded');
        });
    }

    //
    // Accordion elements
    //

    /**
     * A "progressive enhancement" accordion that is accessible and mobile-responsive ready.
     *
     * @constructor
     *
     * @param {Element} element The element to classify as an accordion.
     */
    const Accordion = function (element) {
        this.element = element;
        this.target = this.element.getAttribute('data-target');
        this.body = document.querySelector(this.target);
        this.isAccordion = false;

        // If there is no breakpoint defined, then that means this should be an accordion all the times regardless of
        // the viewport width.
        let breakpoint = this.element.getAttribute('data-breakpoint');
        this.breakpoint = (BREAKPOINTS[breakpoint] - 0.02) || null;

        this.clickCallback = (function (e) {
            let shouldProceed = false;

            if (e.type === 'keydown' && (e.keyCode === KB_Keys.enter || e.keyCode === KB_Keys.space)) {
                shouldProceed = true;
            }
            else if (e.type === 'click') {
                shouldProceed = true;
            }

            if (shouldProceed) {
                e.preventDefault();

                toggleBooleanString(this.element, 'aria-expanded');
            }
        }).bind(this);
    };

    /**
     * Is this element configured to behave as an accordion with the current breakpoint.
     *
     * @returns {boolean}
     */
    Accordion.prototype.isActiveOnCurrentBreakpoint = function () {
        return respondDownBreakpoint() !== -1 && respondDownBreakpoint() <= this.breakpoint;
    };

    /**
     * Add the necessary attributes to this element to make it into an accordion.
     *
     * This method will also disable the accordion attributes if this accordion is not configured to work with the
     * current breakpoint.
     */
    Accordion.prototype.makeAccordion = function () {
        if (this.breakpoint !== null && !this.isActiveOnCurrentBreakpoint()) {
            this.disableAccordion();
            return;
        }

        // Don't reset attributes if we're already an accordion
        if (this.isAccordion) {
            return;
        }

        this.element.setAttribute('aria-expanded', 'false');
        this.element.setAttribute('aria-controls', this.target);
        this.element.setAttribute('role', 'tab');
        this.element.setAttribute('tabindex', '0');

        this.element.addEventListener('click', this.clickCallback);
        this.element.addEventListener('keydown', this.clickCallback);

        this.body.setAttribute('role', 'tabpanel');

        this.isAccordion = true;
    };

    /**
     * Remove all of the attributes that added to this element to make it accordion ready.
     */
    Accordion.prototype.disableAccordion = function () {
        this.element.removeAttribute('aria-expanded');
        this.element.removeAttribute('aria-controls');
        this.element.removeAttribute('role');
        this.element.removeAttribute('tabindex');

        this.element.removeEventListener('click', this.clickCallback);
        this.element.removeEventListener('keydown', this.clickCallback);

        this.body.removeAttribute('role');

        this.isAccordion = false;
    };

    // Register all of the accordions on this page

    const accordionHeaders = document.querySelectorAll('[data-role="accordion"]');
    const accordions = [];

    for (let i = 0; i < accordionHeaders.length; i++) {
        const accordion = new Accordion(accordionHeaders[i]);
        accordion.makeAccordion();

        accordions.push(accordion);
    }

    window.addEventListener('resize', function () {
        for (let i = 0; i < accordions.length; i++) {
            const accordion = accordions[i];

            accordion.makeAccordion();
        }
    });
})();
