const KEY='e360-listing-manager-v1';
let db=JSON.parse(localStorage.getItem(KEY)||'null')||{records:[],payments:[],invoices:[],nextInvoice:1001};
const $=s=>document.querySelector(s); const money=n=>'£'+Number(n||0).toFixed(2);
function save(){localStorage.setItem(KEY,JSON.stringify(db));renderAll()}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('nav button,.page').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('#'+b.dataset.page).classList.add('active')});
function renderAll(){renderRecords();renderPayments();renderInvoices();renderDashboard();renderReports();fillSelects()}
function renderDashboard(){
 const today0=new Date(); const soon=new Date(today0); soon.setDate(soon.getDate()+30);
 const t0=today0.toISOString().slice(0,10), t30=soon.toISOString().slice(0,10);
 const renewals=db.records.filter(r=>r.renewalDate&&r.renewalDate>=t0&&r.renewalDate<=t30&&r.listingStatus==='Active').length;
 const expired=db.records.filter(r=>r.renewalDate&&r.renewalDate<t0&&r.listingStatus==='Active').length;
 $('#renewalAlert').innerHTML=(renewals||expired)?`<b>Listing reminders:</b> ${renewals} renewal(s) due in the next 30 days · ${expired} active listing(s) past their renewal/expiry date.`:'No listing renewals due in the next 30 days.';
 $('#sBusinesses').textContent=db.records.length;$('#sActive').textContent=db.records.filter(r=>r.listingStatus==='Active').length;
 const paidBy=id=>db.payments.filter(p=>p.recordId===id&&p.status==='Paid').reduce((a,p)=>a+Number(p.amount),0);
 let outstanding=0,overdue=0; const today=new Date().toISOString().slice(0,10);
 db.records.forEach(r=>{const due=Math.max(0,Number(r.listingPrice||0)-paidBy(r.id));outstanding+=due;if(due>0&&r.renewalDate&&r.renewalDate<today)overdue++});
 $('#sDue').textContent=money(outstanding);$('#sOverdue').textContent=overdue;
 const rows=db.records.filter(r=>r.renewalDate).sort((a,b)=>a.renewalDate.localeCompare(b.renewalDate)).slice(0,10);
 $('#dueList').innerHTML=rows.length?`<table><tr><th>Business</th><th>Status</th><th>Renewal / expiry</th><th>Price</th><th>Renewal</th></tr>${rows.map(r=>`<tr><td>${esc(r.businessName)}</td><td>${esc(r.listingStatus)}</td><td>${r.renewalDate}</td><td>${money(r.listingPrice)}</td><td><button onclick="renewalEmail('${r.id}')">Email Reminder</button> <button onclick="renewalInvoice('${r.id}')">Create Invoice</button></td></tr>`).join('')}</table>`:'No listing dates entered yet.';
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
function fillSelects(){const opts=db.records.map(r=>`<option value="${r.id}">${esc(r.businessName)}</option>`).join('');$('#payBusiness').innerHTML=opts;$('#invBusiness').innerHTML=opts;$('#statementBusiness').innerHTML=opts}
function renderPayments(){$('#paymentTable').innerHTML=db.payments.length?`<table><tr><th>Date</th><th>Business</th><th>Amount</th><th>Method</th><th>Reference</th><th>Status</th></tr>${[...db.payments].reverse().map(p=>{let r=db.records.find(x=>x.id===p.recordId);return `<tr><td>${p.date}</td><td>${esc(r?.businessName||'Deleted')}</td><td>${money(p.amount)}</td><td>${esc(p.method)}</td><td>${esc(p.reference)}</td><td>${esc(p.status)}</td></tr>`}).join('')}</table>`:'No payments recorded.'}
$('#addPayment').onclick=()=>{if(!db.records.length)return alert('Add a business first.');$('#payDate').value=new Date().toISOString().slice(0,10);$('#paymentDialog').showModal()};
$('#paymentForm').onsubmit=e=>{if(e.submitter?.value==='cancel')return;db.payments.push({id:crypto.randomUUID(),recordId:$('#payBusiness').value,amount:$('#payAmount').value,date:$('#payDate').value,method:$('#payMethod').value,reference:$('#payReference').value,status:$('#payStatus').value});save()};
function invoiceStatus(i){if(i.status==='Paid')return 'Paid';const t=new Date().toISOString().slice(0,10);return i.due&&i.due<t?'Overdue':'Unpaid'}
function renderInvoices(){$('#invoiceTable').innerHTML=db.invoices.length?`<table><tr><th>Invoice</th><th>Business</th><th>Date</th><th>Due</th><th>Amount</th><th>Status</th><th>Actions</th></tr>${[...db.invoices].reverse().map(i=>{let r=db.records.find(x=>x.id===i.recordId),s=invoiceStatus(i);return `<tr><td>${i.number}</td><td>${esc(r?.businessName||'Deleted')}</td><td>${i.date}</td><td>${i.due}</td><td>${money(i.amount)}</td><td><b>${s}</b></td><td><button onclick="printInvoice('${i.id}')">Print/PDF</button> <button onclick="emailInvoice('${i.id}')">Email</button> ${s!=='Paid'?`<button onclick="markInvoicePaid('${i.id}')">Mark Paid</button>`:''}</td></tr>`}).join('')}</table>`:'No invoices created.'}
window.markInvoicePaid=id=>{const i=db.invoices.find(x=>x.id===id);if(!i)return;i.status='Paid';i.paidDate=new Date().toISOString().slice(0,10);if(!db.payments.some(p=>p.invoiceId===id)){db.payments.push({id:crypto.randomUUID(),invoiceId:id,recordId:i.recordId,amount:i.amount,date:i.paidDate,method:'Invoice payment',reference:i.number,status:'Paid'})}save()}
$('#newInvoice').onclick=()=>{if(!db.records.length)return alert('Add a business first.');let r=db.records[0];$('#invBusiness').value=r.id;$('#invAmount').value=r.listingPrice||'';let d=new Date();$('#invDate').value=d.toISOString().slice(0,10);d.setDate(d.getDate()+14);$('#invDue').value=d.toISOString().slice(0,10);$('#invoiceDialog').showModal()};
$('#invBusiness').onchange=()=>{let r=db.records.find(x=>x.id===$('#invBusiness').value);if(r)$('#invAmount').value=r.listingPrice||''};
$('#invoiceForm').onsubmit=e=>{if(e.submitter?.value==='cancel')return;db.invoices.push({id:crypto.randomUUID(),number:'E360-'+db.nextInvoice++,recordId:$('#invBusiness').value,description:$('#invDescription').value,amount:$('#invAmount').value,date:$('#invDate').value,due:$('#invDue').value,status:'Unpaid'});save()};
window.printInvoice=id=>{const i=db.invoices.find(x=>x.id===id),r=db.records.find(x=>x.id===i.recordId);$('#printArea').innerHTML=`<div><h1>Elevore360D</h1><h2>INVOICE ${i.number}</h2><p><b>Invoice date:</b> ${i.date}<br><b>Due date:</b> ${i.due}</p><hr><h3>Bill to</h3><p>${esc(r?.businessName)}<br>${esc(r?.contactName)}<br>${esc(r?.address).replace(/\n/g,'<br>')}<br>${esc(r?.email)}</p><table><tr><th>Description</th><th>Amount</th></tr><tr><td>${esc(i.description)}</td><td>${money(i.amount)}</td></tr></table><h2>Total: ${money(i.amount)}</h2><p>Thank you for listing with Elevore360D Local Deals.</p></div>`;window.print()};
window.emailInvoice=id=>{const i=db.invoices.find(x=>x.id===id),r=db.records.find(x=>x.id===i.recordId);const subject=encodeURIComponent(`Elevore360D Invoice ${i.number}`),body=encodeURIComponent(`Hello ${r?.contactName||''},\n\nPlease find your Elevore360D Local Deals listing invoice details below.\n\nInvoice: ${i.number}\nDescription: ${i.description}\nAmount: ${money(i.amount)}\nInvoice date: ${i.date}\nDue date: ${i.due}\n\nThank you,\nElevore360D`);location.href=`mailto:${encodeURIComponent(r?.email||'')}?subject=${subject}&body=${body}`};
$('#exportBackup').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(db,null,2)],{type:'application/json'}));a.download=`elevore360d-listing-manager-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href)};
$('#importBackup').onchange=async e=>{try{const d=JSON.parse(await e.target.files[0].text());if(!d.records||!d.payments||!d.invoices)throw 0;if(confirm('Replace current data with this backup?')){db=d;save()}}catch{alert('That is not a valid Listing Manager backup.')}};

function renderReports(){
 const paid=db.payments.filter(p=>p.status==='Paid'), pending=db.payments.filter(p=>p.status==='Pending');
 const now=new Date(), ym=now.toISOString().slice(0,7), yy=String(now.getFullYear());
 const sum=x=>x.reduce((n,p)=>n+Number(p.amount||0),0);
 $('#rPaid').textContent=money(sum(paid));$('#rPending').textContent=money(sum(pending));
 $('#rThisMonth').textContent=money(sum(paid.filter(p=>(p.date||'').startsWith(ym))));
 $('#rThisYear').textContent=money(sum(paid.filter(p=>(p.date||'').startsWith(yy))));
 const months={};paid.forEach(p=>{let m=(p.date||'Unknown').slice(0,7);months[m]=(months[m]||0)+Number(p.amount||0)});
 $('#monthlyReport').innerHTML=Object.keys(months).length?`<table><tr><th>Month</th><th>Revenue</th></tr>${Object.keys(months).sort().reverse().map(m=>`<tr><td>${m}</td><td>${money(months[m])}</td></tr>`).join('')}</table>`:'No paid revenue yet.';
 const counts={};db.records.forEach(r=>counts[r.listingStatus]=(counts[r.listingStatus]||0)+1);
 $('#statusReport').innerHTML=`<table><tr><th>Status</th><th>Listings</th></tr>${['Active','Pending','Expired','Cancelled'].map(s=>`<tr><td>${s}</td><td>${counts[s]||0}</td></tr>`).join('')}</table>`;
}


window.renewalEmail=id=>{
 const r=db.records.find(x=>x.id===id); if(!r)return;
 const subject=encodeURIComponent('Elevore360D Local Deals listing renewal');
 const body=encodeURIComponent(`Hello ${r.contactName||''},

Your Elevore360D Local Deals listing is due for renewal on ${r.renewalDate||'the renewal date'}.

Business: ${r.businessName}
Listing: ${r.packageName||'Local Deals Listing'}
Renewal price: ${money(r.listingPrice)}

Please reply to confirm your renewal.

Thank you,
Elevore360D`);
 location.href=`mailto:${encodeURIComponent(r.email||'')}?subject=${subject}&body=${body}`;
};
window.renewalInvoice=id=>{
 const r=db.records.find(x=>x.id===id);if(!r)return;
 const d=new Date(), due=new Date();due.setDate(due.getDate()+14);
 const inv={id:crypto.randomUUID(),number:'E360-'+db.nextInvoice++,recordId:r.id,description:`${r.packageName||'Elevore360D Local Deals listing'} renewal`,amount:r.listingPrice||0,date:d.toISOString().slice(0,10),due:due.toISOString().slice(0,10),status:'Unpaid'};
 db.invoices.push(inv);save();alert(`Invoice ${inv.number} created for ${r.businessName}.`);
};

function businessBalance(id){
 const inv=db.invoices.filter(i=>i.recordId===id).reduce((n,i)=>n+Number(i.amount||0),0);
 const paid=db.payments.filter(p=>p.recordId===id&&p.status==='Paid').reduce((n,p)=>n+Number(p.amount||0),0);
 return inv-paid;
}
function renderStatement(){
 const id=$('#statementBusiness').value,r=db.records.find(x=>x.id===id);
 if(!r){$('#statementArea').innerHTML='Add a business first.';return}
 const inv=db.invoices.filter(i=>i.recordId===id),pay=db.payments.filter(p=>p.recordId===id&&p.status==='Paid');
 const tx=[
   ...inv.map(i=>({date:i.date,type:`Invoice ${i.number}`,debit:Number(i.amount||0),credit:0})),
   ...pay.map(p=>({date:p.date,type:`Payment ${p.reference||''}`,debit:0,credit:Number(p.amount||0)}))
 ].sort((x,y)=>(x.date||'').localeCompare(y.date||''));
 let bal=0;
 const rows=tx.map(t=>{bal+=t.debit-t.credit;return `<tr><td>${t.date||''}</td><td>${esc(t.type)}</td><td>${t.debit?money(t.debit):''}</td><td>${t.credit?money(t.credit):''}</td><td>${money(bal)}</td></tr>`}).join('');
 $('#statementArea').innerHTML=`<div id="statementPrint"><h2>Elevore360D Customer Statement</h2><h3>${esc(r.businessName)}</h3><p>${esc(r.contactName||'')}<br>${esc(r.address||'').replace(/\n/g,'<br>')}<br>${esc(r.email||'')}</p><table><tr><th>Date</th><th>Details</th><th>Invoice</th><th>Payment</th><th>Balance</th></tr>${rows}</table><h3>Balance: ${money(bal)}</h3></div>`;
}
$('#viewStatement').onclick=renderStatement;
$('#printStatement').onclick=()=>{renderStatement();window.print()};

function csvDownload(name,rows){
 if(!rows.length)return alert('There is no data to export.');
 const keys=Object.keys(rows[0]);
 const q=v=>`"${String(v??'').replace(/"/g,'""')}"`;
 const csv=[keys.map(q).join(','),...rows.map(r=>keys.map(k=>q(r[k])).join(','))].join('\r\n');
 const u=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),x=document.createElement('a');
 x.href=u;x.download=name;x.click();URL.revokeObjectURL(u);
}
$('#exportPaymentsCsv').onclick=()=>csvDownload('elevore360d-payments.csv',db.payments.map(p=>{let r=db.records.find(x=>x.id===p.recordId);return {date:p.date,business:r?.businessName||'',amount:p.amount,method:p.method,reference:p.reference,status:p.status}}));
$('#exportInvoicesCsv').onclick=()=>csvDownload('elevore360d-invoices.csv',db.invoices.map(i=>{let r=db.records.find(x=>x.id===i.recordId);return {invoice:i.number,business:r?.businessName||'',date:i.date,due:i.due,description:i.description,amount:i.amount,status:invoiceStatus(i)}}));
$('#exportBusinessesCsv').onclick=()=>csvDownload('elevore360d-businesses.csv',db.records.map(r=>({business:r.businessName,contact:r.contactName,email:r.email,phone:r.phone,package:r.packageName,price:r.listingPrice,start:r.startDate,renewal:r.renewalDate,status:r.listingStatus,balance:businessBalance(r.id)})));

blankRecord();renderAll();