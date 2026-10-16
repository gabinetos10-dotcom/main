/* ==========================================================================
   GJS — ONGLETS ACCESSIBLES (motif ARIA « tabs », activation automatique)

   <div data-tabs>
     <div role="tablist" aria-label="…" class="tabs__list">
       <button role="tab" id="t1" aria-controls="p1" aria-selected="true">…</button>
       <button role="tab" id="t2" aria-controls="p2" aria-selected="false" tabindex="-1">…</button>
     </div>
     <div role="tabpanel" id="p1" aria-labelledby="t1" tabindex="0">…</div>
     <div role="tabpanel" id="p2" aria-labelledby="t2" tabindex="0" hidden>…</div>
   </div>

   Flèches (gauche/droite et haut/bas), Début, Fin. Sans JS, tous les panneaux
   restent visibles (voir base.css). Événement « tabs:change » sur [data-tabs]
   (detail : { index, tab, panel, previous }) pour animer le changement.
   ========================================================================== */

export function initTabs(scope, root) {
  root.querySelectorAll('[data-tabs]').forEach((group) => {
    const tabs = Array.from(group.querySelectorAll('[role="tab"]'));
    const panels = tabs.map((tab) => document.getElementById(tab.getAttribute('aria-controls')));
    if (!tabs.length || panels.some((p) => !p)) return;
    let current = Math.max(0, tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true'));

    const select = (index, { focus = false } = {}) => {
      const previous = current;
      current = (index + tabs.length) % tabs.length;
      tabs.forEach((tab, i) => {
        const on = i === current;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
        panels[i].hidden = !on;
      });
      if (focus) tabs[current].focus();
      if (previous !== current) {
        group.dispatchEvent(new CustomEvent('tabs:change', {
          detail: { index: current, tab: tabs[current], panel: panels[current], previous },
        }));
      }
    };

    select(current);
    tabs.forEach((tab, i) => {
      scope.on(tab, 'click', () => select(i));
      scope.on(tab, 'keydown', (e) => {
        const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
        if (keys[e.key]) { e.preventDefault(); select(current + keys[e.key], { focus: true }); }
        else if (e.key === 'Home') { e.preventDefault(); select(0, { focus: true }); }
        else if (e.key === 'End') { e.preventDefault(); select(tabs.length - 1, { focus: true }); }
      });
    });
  });
}
