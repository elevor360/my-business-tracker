const KEY='e360-listing-manager-v1';
let db=JSON.parse(localStorage.getItem(KEY)||'null')||{records:[],payments:[],invoices:[],nextInvoice:1001};
const $=s=>document.querySelector(s); const money=n=>'£'+Number(n||0).toFixed(2);
function save(){localStorage.setItem(KEY,JSON.stringify(db));renderAll()}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('nav button,.page').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('#'+b.dataset.page).classList.add('active')});
function renderAll(){renderRecords();renderPayments();renderInvoices();renderDashboard();fillSelects()}
function renderDashboard(){
 $('#sBusinesses').textContent=db.records.length;$('#sActive').textContent=db.records.filter(r=>r.listingStatus==='Active').length;
 const paidBy=id=>db.payments.filter(p=>p.recordId===id&&p.status==='Paid').reduce((a,p)=>a+Number(p.amount),0);
 let outstanding=0,overdue=0; const today=new Date().toISOString().slice(0,10);
 db.records.forEach(r=>{const due=Math.max(0,Number(r.listingPrice||0)-paidBy(r.id));outstanding+=due;if(due>0&&r.renewalDate&&r.renewalDate<today)overdue++});
 $('#sDue').textContent=money(outstanding);$('#sOverdue').textContent=overdue;
 const rows=db.records.filter(r=>r.renewalDate).sort((a,b)=>a.renewalDate.localeCompare(b.renewalDate)).slice(0,10);
 $('#dueList').innerHTML=rows.length?`<table><tr><th>Business</th><th>Status</th><th>Renewal / expiry</th><th>Price</th></tr>${rows.map(r=>`<tr><td>${esc(r.businessName)}</td><td>${esc(r.listingStatus)}</td><td>${r.renewalDate}</td><td>${money(r.listingPrice)}</td></tr>`).join('')}</table>`:'No listing dates entered yet.';
}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function renderRecords(){
 const q=($('#recordSearch')?.value||'').toLowerCase();
 const rows=db.records.filter(r=>`${r.businessName} ${r.contactName} ${r.email}`.toLowerCase().includes(q));
 $('#recordList').innerHTML=rows.map(r=>`<div class="record" data-id="${r.id}"><b>${esc(r.businessName)}</b><small>${esc(r.contactName)} · ${esc(r.listingStatus)}</small></div>`).join('')||'No businesses yet.';
 document.querySelectorAll('.record').forEach(x=>x.onclick=()=>editRecord(x.dataset.id));
}
function blankRecord(){$('#recordForm').reset();$('#recordId').value='';$('#packageName').value='Local Deals Listing';$('#listingStatus').value='Active'}
function editRecord(id){const r=db.records.find(x=>x.id===id);if(!r)return;Object.keys(r).forEach(k=>{const e=$('#'+k);if(e)e.value=r[k]??''})}
$('#newRecord').onclick=blankRecord;$('#recordSearch').oninput=renderRecords;
$('#recordForm').onsubmit=e=>{e.preventDefault();let id=$('#recordId').value||crypto.randomUUID();const r={id};['businessName','contactName','email','phone','address','packageName','listingPrice','startDate','renewalDate','listingStatus','paymentMethod','notes'].forEach(k=>r[k]=$('#'+k).value);const i=db.records.findIndex(x=>x.id===id);if(i>=0)db.records[i]=r;else db.records.push(r);$('#recordId').value=id;save()};
$('#deleteRecord').onclick=()=>{const id=$('#recordId').value;if(id&&confirm('Delete this business record?')){db.records=db.records.filter(r=>r.id!==id);save();blankRecord()}};
function fillSelects(){const opts=db.records.map(r=>`<option value="${r.id}">${esc(r.businessName)}</option>`).join('');$('#payBusiness').innerHTML=opts;$('#invBusiness').innerHTML=opts}
function renderPayments(){$('#paymentTable').innerHTML=db.payments.length?`<table><tr><th>Date</th><th>Business</th><th>Amount</th><th>Method</th><th>Reference</th><th>Status</th></tr>${[...db.payments].reverse().map(p=>{let r=db.records.find(x=>x.id===p.recordId);return `<tr><td>${p.date}</td><td>${esc(r?.businessName||'Deleted')}</td><td>${money(p.amount)}</td><td>${esc(p.method)}</td><td>${esc(p.reference)}</td><td>${esc(p.status)}</td></tr>`}).join('')}</table>`:'No payments recorded.'}
$('#addPayment').onclick=()=>{if(!db.records.length)return alert('Add a business first.');$('#payDate').value=new Date().toISOString().slice(0,10);$('#paymentDialog').showModal()};
$('#paymentForm').onsubmit=e=>{if(e.submitter?.value==='cancel')return;db.payments.push({id:crypto.randomUUID(),recordId:$('#payBusiness').value,amount:$('#payAmount').value,date:$('#payDate').value,method:$('#payMethod').value,reference:$('#payReference').value,status:$('#payStatus').value});save()};
function renderInvoices(){$('#invoiceTable').innerHTML=db.invoices.length?`<table><tr><th>Invoice</th><th>Business</th><th>Date</th><th>Due</th><th>Amount</th><th>Actions</th></tr>${[...db.invoices].reverse().map(i=>{let r=db.records.find(x=>x.id===i.recordId);return `<tr><td>${i.number}</td><td>${esc(r?.businessName||'Deleted')}</td><td>${i.date}</td><td>${i.due}</td><td>${money(i.amount)}</td><td><button onclick="printInvoice('${i.id}')">Print</button> <button onclick="emailInvoice('${i.id}')">Email</button></td></tr>`}).join('')}</table>`:'No invoices created.'}
$('#newInvoice').onclick=()=>{if(!db.records.length)return alert('Add a business first.');let r=db.records[0];$('#invBusiness').value=r.id;$('#invAmount').value=r.listingPrice||'';let d=new Date();$('#invDate').value=d.toISOString().slice(0,10);d.setDate(d.getDate()+14);$('#invDue').value=d.toISOString().slice(0,10);$('#invoiceDialog').showModal()};
$('#invBusiness').onchange=()=>{let r=db.records.find(x=>x.id===$('#invBusiness').value);if(r)$('#invAmount').value=r.listingPrice||''};
$('#invoiceForm').onsubmit=e=>{if(e.submitter?.value==='cancel')return;db.invoices.push({id:crypto.randomUUID(),number:'E360-'+db.nextInvoice++,recordId:$('#invBusiness').value,description:$('#invDescription').value,amount:$('#invAmount').value,date:$('#invDate').value,due:$('#invDue').value});save()};
window.printInvoice=id=>{const i=db.invoices.find(x=>x.id===id),r=db.records.find(x=>x.id===i.recordId);$('#printArea').innerHTML=`<div><h1>Elevore360D</h1><h2>INVOICE ${i.number}</h2><p><b>Invoice date:</b> ${i.date}<br><b>Due date:</b> ${i.due}</p><hr><h3>Bill to</h3><p>${esc(r?.businessName)}<br>${esc(r?.contactName)}<br>${esc(r?.address).replace(/\n/g,'<br>')}<br>${esc(r?.email)}</p><table><tr><th>Description</th><th>Amount</th></tr><tr><td>${esc(i.description)}</td><td>${money(i.amount)}</td></tr></table><h2>Total: ${money(i.amount)}</h2><p>Thank you for listing with Elevore360D Local Deals.</p></div>`;window.print()};
window.emailInvoice=id=>{const i=db.invoices.find(x=>x.id===id),r=db.records.find(x=>x.id===i.recordId);const subject=encodeURIComponent(`Elevore360D Invoice ${i.number}`),body=encodeURIComponent(`Hello ${r?.contactName||''},\n\nPlease find your Elevore360D Local Deals listing invoice details below.\n\nInvoice: ${i.number}\nDescription: ${i.description}\nAmount: ${money(i.amount)}\nInvoice date: ${i.date}\nDue date: ${i.due}\n\nThank you,\nElevore360D`);location.href=`mailto:${encodeURIComponent(r?.email||'')}?subject=${subject}&body=${body}`};
$('#exportBackup').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(db,null,2)],{type:'application/json'}));a.download=`elevore360d-listing-manager-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href)};
$('#importBackup').onchange=async e=>{try{const d=JSON.parse(await e.target.files[0].text());if(!d.records||!d.payments||!d.invoices)throw 0;if(confirm('Replace current data with this backup?')){db=d;save()}}catch{alert('That is not a valid Listing Manager backup.')}};
blankRecord();renderAll();