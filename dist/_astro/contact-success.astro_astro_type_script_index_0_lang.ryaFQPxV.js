import{c as u}from"./store.SSxY7c3i.js";function p(){const n=document.getElementById("data-bridge"),i=document.getElementById("item-list"),o=document.getElementById("copy-btn"),a=document.getElementById("copy-status");if(!n||!i||!o||!a)return;const g=JSON.parse(n.getAttribute("data-products")||"[]"),c=n.getAttribute("data-ads-id"),d=n.getAttribute("data-ads-label"),r=new URLSearchParams(window.location.search),l=r.get("id"),m=r.get("from")==="cart";let e=[];if(l){const t=g.find(s=>s.id===l);t&&e.push(t)}else m&&(e=u.get());e.length>0?i.innerHTML=e.map(t=>`
        <div class="item-row">
          <span class="name">${t.name}</span>
          <span class="price">$${t.price.toLocaleString()}</span>
        </div>
      `).join(""):i.innerHTML='<p style="text-align:center; opacity:0.5;">清單內目前沒有商品</p>',o.addEventListener("click",()=>{if(e.length===0)return;const t=`詢問商品：
`+e.map(s=>`${s.name} $${s.price.toLocaleString()}`).join(`
`);navigator.clipboard.writeText(t).then(()=>{a.innerText="✓ 已複製！請在 LINE 對話框「貼上」",a.classList.add("success"),typeof window.gtag=="function"&&c&&d&&window.gtag("event","conversion",{send_to:`${c}/${d}`})}).catch(()=>{a.innerText="複製失敗，請手動複製網頁文字"})})}document.addEventListener("astro:page-load",p);p();
