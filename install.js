let promptEvent=null;const bar=document.getElementById('installBar');const installed=()=>matchMedia('(display-mode:standalone)').matches||navigator.standalone===true;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();promptEvent=e;if(!installed())bar.hidden=false});
document.getElementById('installBtn').onclick=async()=>{if(promptEvent){promptEvent.prompt();await promptEvent.userChoice;promptEvent=null;bar.hidden=true}};
document.getElementById('installClose').onclick=()=>bar.hidden=true;
window.addEventListener('appinstalled',()=>bar.hidden=true);
if(installed())bar.hidden=true;
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js'));