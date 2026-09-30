import { h } from 'preact';
import htm from 'htm';

/** JSX-like tagged templates for Preact, without a build step. */
export const html = htm.bind(h);
