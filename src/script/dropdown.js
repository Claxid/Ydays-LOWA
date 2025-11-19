// dropdown.js — enhance dropdown buttons for click/touch and accessibility
(function(){
  function closeAll(){
    document.querySelectorAll('.dropdown').forEach(d=>{
      const btn = d.querySelector('.mainmenubtn');
      const child = d.querySelector('.dropdown-child');
      if(btn) btn.setAttribute('aria-expanded','false');
      if(child) child.setAttribute('aria-hidden','true');
      d.classList.remove('open');
    });
  }

  document.addEventListener('click', function(e){
    const btn = e.target.closest('.mainmenubtn');
    if(btn && btn.closest('.dropdown')){
      const wrap = btn.closest('.dropdown');
      const child = wrap.querySelector('.dropdown-child');
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      // toggle
      if(expanded){
        btn.setAttribute('aria-expanded','false');
        if(child) child.setAttribute('aria-hidden','true');
        wrap.classList.remove('open');
      } else {
        closeAll();
        btn.setAttribute('aria-expanded','true');
        if(child) child.setAttribute('aria-hidden','false');
        wrap.classList.add('open');
      }
      e.stopPropagation();
      return;
    }
    // clicked outside any dropdown: close all
    if(!e.target.closest('.dropdown')) closeAll();
  });

  // close on Escape
  document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeAll(); });
})();
