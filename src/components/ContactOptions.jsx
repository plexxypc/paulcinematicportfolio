import { useCallback, useEffect, useRef, useState } from 'react';

const WHATSAPP_MESSAGE = "Hi Paul, I found you through your website and I'd like to talk.";

/**
 * @typedef {Object} contact_link
 * @property {string} id - Stable key for the link.
 * @property {string} label - Human-readable platform name.
 * @property {string} handle - Short account hint shown under the label.
 * @property {string} href - Destination URL.
 */

/** @type {contact_link[]} */
export const CONTACT_LINKS = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    handle: '+234 903 353 9305',
    href: `https://wa.me/2349033539305?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    handle: '@plexxypc',
    href: 'https://www.instagram.com/plexxypc/',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    handle: 'paul.udor',
    href: 'https://www.facebook.com/paul.udor',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    handle: 'in/paul-udor',
    href: 'https://www.linkedin.com/in/paul-udor/',
  },
];

/**
 * Renders the stroke-style brand icon for a contact platform.
 *
 * @param {Object} props
 * @param {string} props.icon_id - One of the CONTACT_LINKS ids, or 'chat' / 'close'.
 * @returns {JSX.Element | null} The SVG icon, or null for an unknown id.
 */
export function ContactIcon({ icon_id }) {
  const svg_props = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  switch (icon_id) {
    case 'whatsapp':
      return (
        <svg {...svg_props}>
          <path d="M3.5 20.5l1.3-4.1A8.5 8.5 0 1 1 8 19.4Z" />
          <path d="M9 8.6c.2-.5.5-.6.8-.6h.5c.2 0 .4.1.5.4l.7 1.6c.1.2 0 .5-.1.6l-.6.7c.6 1.1 1.6 2.1 2.7 2.7l.7-.6c.2-.1.4-.2.6-.1l1.6.7c.3.1.4.3.4.5v.5c0 .3-.1.6-.6.8-.6.3-1.4.4-2.3.1-2-.7-3.9-2.6-4.6-4.6-.3-.9-.2-1.7.1-2.3Z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg {...svg_props}>
          <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
      );
    case 'facebook':
      return (
        <svg {...svg_props}>
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg {...svg_props}>
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
          <rect x="2" y="9" width="4" height="12" />
          <circle cx="4" cy="4" r="2" />
        </svg>
      );
    case 'chat':
      return (
        <svg {...svg_props} width={24} height={24}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case 'close':
      return (
        <svg {...svg_props} width={22} height={22}>
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      );
    default:
      return null;
  }
}

/**
 * Renders the list of contact links shared by the floating menu and the modal.
 *
 * @param {Object} props
 * @param {() => void} [props.on_hover_start] - Called when the pointer enters a link.
 * @param {() => void} [props.on_hover_end] - Called when the pointer leaves a link.
 * @param {boolean} [props.show_handles=false] - Whether to show the account hint under each label.
 * @returns {JSX.Element} The contact list.
 */
export function ContactList({ on_hover_start, on_hover_end, show_handles = false }) {
  return (
    <ul className="contact-list">
      {CONTACT_LINKS.map((link) => (
        <li key={link.id}>
          <a
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className={`contact-link contact-link--${link.id}`}
            onMouseEnter={on_hover_start}
            onMouseLeave={on_hover_end}
          >
            <span className="contact-link__icon">
              <ContactIcon icon_id={link.id} />
            </span>
            <span className="contact-link__text">
              <span className="contact-link__label">{link.label}</span>
              {show_handles && <span className="contact-link__handle">{link.handle}</span>}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * Registers an Escape-key listener while `is_active` is true.
 *
 * @param {boolean} is_active - Whether the listener should be attached.
 * @param {() => void} on_escape - Called when Escape is pressed.
 * @returns {void}
 */
function use_escape_key(is_active, on_escape) {
  useEffect(() => {
    if (!is_active) return undefined;

    /**
     * @param {KeyboardEvent} event
     * @returns {void}
     */
    function handle_key_down(event) {
      if (event.key === 'Escape') on_escape();
    }

    window.addEventListener('keydown', handle_key_down);
    return () => window.removeEventListener('keydown', handle_key_down);
  }, [is_active, on_escape]);
}

/**
 * Floating chat button pinned to the bottom-right that toggles a contact menu.
 *
 * @param {Object} props
 * @param {() => void} [props.on_hover_start] - Called when the pointer enters an interactive element.
 * @param {() => void} [props.on_hover_end] - Called when the pointer leaves an interactive element.
 * @returns {JSX.Element} The floating button and its menu.
 */
export function ContactFab({ on_hover_start, on_hover_end }) {
  const [is_open, set_is_open] = useState(false);
  const root_ref = useRef(null);

  const close_menu = useCallback(() => set_is_open(false), []);
  use_escape_key(is_open, close_menu);

  useEffect(() => {
    if (!is_open) return undefined;

    /**
     * Closes the menu when a click lands outside the floating widget.
     *
     * @param {PointerEvent} event
     * @returns {void}
     */
    function handle_pointer_down(event) {
      if (root_ref.current && !root_ref.current.contains(event.target)) set_is_open(false);
    }

    window.addEventListener('pointerdown', handle_pointer_down);
    return () => window.removeEventListener('pointerdown', handle_pointer_down);
  }, [is_open]);

  return (
    <div ref={root_ref} className={`contact-fab ${is_open ? 'contact-fab--open' : ''}`}>
      <div className="contact-fab__menu" id="contact-fab-menu" aria-hidden={!is_open}>
        <p className="contact-fab__title">Reach me on</p>
        <ContactList on_hover_start={on_hover_start} on_hover_end={on_hover_end} />
      </div>
      <button
        type="button"
        className="contact-fab__button"
        aria-label={is_open ? 'Close contact options' : 'Open contact options'}
        aria-expanded={is_open}
        aria-controls="contact-fab-menu"
        onClick={() => set_is_open((prev_is_open) => !prev_is_open)}
        onMouseEnter={on_hover_start}
        onMouseLeave={on_hover_end}
      >
        <ContactIcon icon_id={is_open ? 'close' : 'chat'} />
      </button>
    </div>
  );
}

/**
 * Centered modal listing every contact option, opened from the "Let's Talk" button.
 *
 * @param {Object} props
 * @param {boolean} props.is_open - Whether the modal is visible.
 * @param {() => void} props.on_close - Called when the modal should close.
 * @param {() => void} [props.on_hover_start] - Called when the pointer enters an interactive element.
 * @param {() => void} [props.on_hover_end] - Called when the pointer leaves an interactive element.
 * @returns {JSX.Element | null} The modal, or null when closed.
 */
export function ContactModal({ is_open, on_close, on_hover_start, on_hover_end }) {
  const close_button_ref = useRef(null);

  use_escape_key(is_open, on_close);

  useEffect(() => {
    if (is_open) close_button_ref.current?.focus();
  }, [is_open]);

  if (!is_open) return null;

  return (
    <div className="contact-modal" onPointerDown={on_close}>
      <div
        className="contact-modal__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          ref={close_button_ref}
          type="button"
          className="contact-modal__close"
          aria-label="Close"
          onClick={on_close}
          onMouseEnter={on_hover_start}
          onMouseLeave={on_hover_end}
        >
          <ContactIcon icon_id="close" />
        </button>
        <h2 id="contact-modal-title" className="contact-modal__title">Let&apos;s talk</h2>
        <p className="contact-modal__subtitle">Pick whichever is easiest for you.</p>
        <ContactList on_hover_start={on_hover_start} on_hover_end={on_hover_end} show_handles />
      </div>
    </div>
  );
}
