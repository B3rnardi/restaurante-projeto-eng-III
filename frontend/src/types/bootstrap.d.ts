/** Tipagem mínima do Bootstrap carregado por <script> (bootstrap.bundle.min.js). */
interface BootstrapComponent {
  show(): void;
  hide(): void;
  dispose(): void;
}
interface BootstrapComponentClass {
  getOrCreateInstance(elemento: Element, opcoes?: Record<string, unknown>): BootstrapComponent;
}
declare const bootstrap: {
  Modal: BootstrapComponentClass;
  Toast: BootstrapComponentClass;
  Collapse: BootstrapComponentClass;
};
