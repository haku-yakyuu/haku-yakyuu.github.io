import{i as d,c as p,u as i,r as g}from"./store.SSxY7c3i.js";const r=document.getElementById("cart-sidebar"),a=document.getElementById("cart-overlay"),b=document.getElementById("close-cart"),n=document.getElementById("cart-items-container"),o=document.getElementById("cart-total"),l=document.querySelector(".cart-title");d.subscribe(s=>{s?(r?.classList.add("open"),a?.classList.add("open")):(r?.classList.remove("open"),a?.classList.remove("open"))});const m=()=>d.set(!1);b?.addEventListener("click",m);a?.addEventListener("click",m);p.subscribe(s=>{if(!n||!o||!l)return;l.textContent=`您的購物車 (${s.length})`;const u=s.reduce((e,t)=>e+t.price*t.quantity,0);if(o.textContent=new Intl.NumberFormat("zh-TW",{style:"currency",currency:"TWD",maximumFractionDigits:0}).format(u),s.length===0){n.innerHTML='<p class="empty-msg">購物車是空的</p>';return}n.innerHTML="",s.forEach(e=>{const t=document.createElement("div");t.className="cart-item";let c=e.image&&e.image!=="no_image",v=c?`<img src="${e.image}" alt="${e.name}">`:'<span class="material-symbols-outlined">shopping_bag</span>';const y=new Intl.NumberFormat("zh-TW",{style:"currency",currency:"TWD",maximumFractionDigits:0}).format(e.price);t.innerHTML=`
        <div class="item-thumb-box ${c?"has-image":"no-image"}">
          ${v}
        </div>
        <div class="item-info">
          
          <div class="info-top">
            <div class="item-title">${e.name}</div>
            <div class="item-price">${y}</div>
          </div>

          <div class="info-bottom">
            <div class="qty-control">
              <div class="qty-btn minus">−</div>
              <div class="qty-val">${e.quantity}</div>
              <div class="qty-btn plus">+</div>
            </div>
            
            <div class="remove-box">
              <span class="material-symbols-outlined">close</span>
            </div>
          </div>
        </div>
      `,t.querySelector(".minus")?.addEventListener("click",()=>i(e.id,e.quantity-1)),t.querySelector(".plus")?.addEventListener("click",()=>i(e.id,e.quantity+1)),t.querySelector(".remove-box")?.addEventListener("click",()=>g(e.id)),n.appendChild(t)})});
