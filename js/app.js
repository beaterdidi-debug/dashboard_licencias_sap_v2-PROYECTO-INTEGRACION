// Dashboard de licencias SAP: importación, porcentajes, alertas y análisis de inactividad.
const $ = id => document.getElementById(id);
let allRows = [], visibleRows = [], inactiveRows = [], alertRows = [];
const charts = {};
const palette = ['#6f8f55','#d7a84b','#8064a2','#c77b30','#477b69','#a75d3d','#8b9b71','#bf9865','#547a8a','#9b7a9e','#d17a56','#6e7965'];
const aliases = {
 user:['Usuarios','Usuario','User','Username','BNAME'],
 firstName:['Nombre','First name','Name'],
 surname:['Apellido','Last name','Surname'],
 id:['ID','Tipo de licencia','License ID'],
 contractType:['Tp.usuario contract.','Tipo usuario contractual','Contract user type'],
 userType:['Tipo','Tipo de usuario','User type'],
 group:['Grupo','Group','Grupo de usuarios'],
 systemEntry:['Entr.sist.','Entrada sistema','System entry','Último ingreso','Ultimo ingreso','Last logon'],
 validFrom:['Válido de','Valido de','Valid from'],
 validTo:['Fin valid.','Fin validez','Valid to'],
 classification:['Cl.clasif.','Clasificación','Classification'],
 classificationText:['Texto clase','Texto clasificación','Classification text'],
 company:['EMPRESA','Empresa','Company','Sociedad'],
 client:['Md.','Mandante','Client']
};
const cols = [
 ['user','Usuarios'],['firstName','Nombre'],['surname','Apellido'],['id','ID'],['contractType','Tp.usuario contract.'],
 ['userType','Tipo'],['group','Grupo'],['company','EMPRESA'],['client','Md.'],['systemEntry','Entr.sist.'],
 ['validFrom','Válido de'],['validTo','Fin valid.'],['classification','Cl.clasif.'],['classificationText','Texto clase']
];
function norm(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[_-]+/g,' ').replace(/\s+/g,' ')}
function resolveColumn(headers, list){return headers.find(h=>list.some(a=>norm(h)===norm(a)))||headers.find(h=>list.some(a=>norm(h).includes(norm(a))))}
function parseDate(value){
 if(value===null||value===undefined||String(value).trim()==='') return null;
 if(value instanceof Date && !isNaN(value)) return new Date(value.getFullYear(),value.getMonth(),value.getDate());
 if(typeof value==='number' && value>20000 && value<80000){const d=new Date(Date.UTC(1899,11,30)+value*86400000);return new Date(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())}
 const s=String(value).trim();
 let m=s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
 if(m){const d=new Date(+m[3],+m[2]-1,+m[1]);return isNaN(d)?null:d}
 m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
 if(m){const d=new Date(+m[1],+m[2]-1,+m[3]);return isNaN(d)?null:d}
 const d=new Date(s);return isNaN(d)?null:new Date(d.getFullYear(),d.getMonth(),d.getDate());
}
function formatDate(d){return d?d.toLocaleDateString('es-CO',{day:'2-digit',month:'2-digit',year:'numeric'}):'Sin fecha'}
function daysBetween(a,b){return Math.floor((a-b)/86400000)}
function normalizeData(raw){
 return raw.filter(r=>r&&Object.values(r).some(v=>String(v??'').trim()!=='')).map((row,i)=>{
  const headers=Object.keys(row),out={_row:i};
  for(const [field,list] of Object.entries(aliases)){const key=resolveColumn(headers,list);out[field]=key?String(row[key]??'').trim():''}
  for(const f of Object.keys(aliases)) if(!out[f])out[f]='No informado';
  out._entryDate=parseDate(out.systemEntry);out._validToDate=parseDate(out.validTo);
  return out;
 });
}
function uniq(values){return [...new Set(values.filter(v=>v&&v!=='No informado'))].sort((a,b)=>a.localeCompare(b,'es',{numeric:true,sensitivity:'base'}))}
function setOptions(id,values,label){const el=$(id),old=el.value;el.innerHTML='';const first=document.createElement('option');first.value='';first.textContent=label;el.appendChild(first);uniq(values).forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;el.appendChild(o)});if([...el.options].some(o=>o.value===old))el.value=old}
function refreshFilters(){setOptions('companyFilter',allRows.map(r=>r.company),'Todas las empresas');setOptions('groupFilter',allRows.map(r=>r.group),'Todos los grupos');setOptions('idFilter',allRows.map(r=>r.id),'Todos los ID')}
function countBy(rows,field){const map=new Map();rows.forEach(r=>{const k=r[field]||'No informado';map.set(k,(map.get(k)||0)+1)});return [...map.entries()].sort((a,b)=>b[1]-a[1])}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function pct(value,total){return total?value/total*100:0}
function percentLabel(v){return `${v.toLocaleString('es-CO',{maximumFractionDigits:1})}%`}
function registerPlugin(){if(window.Chart&&window.ChartDataLabels)Chart.register(ChartDataLabels)}
function makeChart(id,type,labels,datasets,opts={}){
 if(charts[id])charts[id].destroy();
 const commonDatalabels={
  color:opts.labelColor||'#263329',font:{weight:'bold',size:10},
  formatter:(value,ctx)=>{
   if(opts.percentStacked){const total=ctx.chart.data.datasets.reduce((sum,ds)=>sum+(Number(ds.data[ctx.dataIndex])||0),0);return total?percentLabel(value/total*100):''}
   if(opts.percentOfTotal){const total=opts.percentBase||ctx.chart.data.datasets.reduce((sum,ds)=>sum+ds.data.reduce((a,b)=>a+(Number(b)||0),0),0);return value?percentLabel(value/total*100):''}
   if(type==='doughnut'){const total=ctx.dataset.data.reduce((a,b)=>a+(Number(b)||0),0);return value?`${percentLabel(pct(value,total))}\n(${value})`:''}
   return value;
  }
 };
 charts[id]=new Chart($(id),{type,data:{labels,datasets},options:{
  responsive:true,maintainAspectRatio:false,indexAxis:opts.horizontal?'y':'x',
  plugins:{legend:{display:opts.legend??(type==='doughnut'),position:'bottom',labels:{usePointStyle:true,boxWidth:8,padding:13,font:{size:10}}},
   datalabels:{display:opts.showLabels!==false,align:opts.horizontal?'end':'center',anchor:opts.horizontal?'end':'center',clamp:true,clip:false,...commonDatalabels},
   tooltip:{callbacks:{label:ctx=>{const value=Number(ctx.raw)||0;if(opts.percentStacked){const total=ctx.chart.data.datasets.reduce((s,ds)=>s+(Number(ds.data[ctx.dataIndex])||0),0);return ` ${ctx.dataset.label}: ${value} (${percentLabel(pct(value,total))})`}if(opts.percentOfTotal){const total=opts.percentBase||ctx.dataset.data.reduce((a,b)=>a+(Number(b)||0),0);return ` ${ctx.dataset.label||''}: ${value} (${percentLabel(pct(value,total))})`}return ` ${ctx.dataset.label||''}: ${value}`}}}},
  scales:type==='doughnut'?{}:{x:{stacked:!!opts.stacked,beginAtZero:true,max:opts.percentStacked?100:undefined,ticks:{precision:0,font:{size:10},callback:opts.percentStacked?(v=>v+'%'):undefined},grid:{color:'#eeeee7'}},y:{stacked:!!opts.stacked,beginAtZero:true,ticks:{font:{size:10}},grid:{display:false}}}
 }});
}
function renderCharts(rows){
 const total=rows.length,ids=countBy(rows,'id');
 makeChart('idChart','doughnut',ids.map(x=>x[0]),[{label:'Registros',data:ids.map(x=>x[1]),backgroundColor:ids.map((_,i)=>palette[i%palette.length]),borderColor:'#fff',borderWidth:3,hoverOffset:6}],{legend:false});
 $('idLegend').innerHTML=ids.map(([name,n],i)=>`<span class="legend-item"><i class="legend-dot" style="background:${palette[i%palette.length]}"></i>${esc(name)}: <b>${n.toLocaleString('es-CO')}</b> · ${percentLabel(pct(n,total))}</span>`).join('')||'Sin datos';
 const companies=countBy(rows,'company');
 makeChart('companyChart','bar',companies.map(x=>x[0]),[{label:'Registros',data:companies.map(x=>x[1]),backgroundColor:companies.map((_,i)=>palette[i%palette.length]),borderRadius:5}],{horizontal:true,legend:false,percentOfTotal:true,percentBase:total});
 const groups=countBy(rows,'group').slice(0,15);
 makeChart('groupChart','bar',groups.map(x=>x[0]),[{label:'Registros',data:groups.map(x=>x[1]),backgroundColor:groups.map((_,i)=>palette[(i+2)%palette.length]),borderRadius:4}],{horizontal:true,legend:false,percentOfTotal:true,percentBase:total});
 // Resumen sencillo: total de usuarios por ID, sin desglosar por empresa ni grupo.
 const licenseCounts=countBy(rows,'id');
 makeChart('companyIdChart','bar',licenseCounts.map(x=>x[0]),[
  {label:'Usuarios',data:licenseCounts.map(x=>x[1]),backgroundColor:licenseCounts.map((_,i)=>palette[i%palette.length]),borderRadius:5,minBarLength:3}
 ],{horizontal:true,legend:false,showLabels:true});
}
function getFilteredRows(){
 const company=$('companyFilter').value,group=$('groupFilter').value,id=$('idFilter').value,q=norm($('searchInput').value);
 return allRows.filter(r=>(!company||r.company===company)&&(!group||r.group===group)&&(!id||r.id===id)&&(!q||[r.user,r.firstName,r.surname,r.id,r.contractType,r.group,r.company].some(v=>norm(v).includes(q))));
}
function tableHtml(rows,columns){if(!rows.length)return '<div class="empty-state">No hay registros que coincidan.</div>';return `<table><thead><tr>${columns.map(([,label])=>`<th>${esc(label)}</th>`).join('')}</tr></thead><tbody>${rows.slice(0,500).map(r=>'<tr>'+columns.map(([f])=>{let val=r[f];if(f==='daysInactive')val=Number.isFinite(val)?`${val} días`:val;if(f==='recommendation')return `<td><span class="status-pill status-amber">${esc(val)}</span></td>`;if(f==='severity')return `<td><span class="status-pill ${val==='Crítica'?'status-red':val==='Advertencia'?'status-amber':'status-green'}">${esc(val)}</span></td>`;return `<td>${f==='id'?`<span class="id-pill">${esc(val||'No informado')}</span>`:esc(val||'No informado')}</td>`}).join('')+'</tr>').join('')}${rows.length>500?'<tr><td colspan="'+columns.length+'">Se muestran los primeros 500 registros.</td></tr>':''}</tbody></table>`}
function updateMain(){
 visibleRows=getFilteredRows();
 $('totalRecords').textContent=visibleRows.length.toLocaleString('es-CO');
 $('uniqueUsers').textContent=new Set(visibleRows.filter(r=>r.user!=='No informado').map(r=>r.user)).size.toLocaleString('es-CO');
 $('companyCount').textContent=uniq(visibleRows.map(r=>r.company)).length;
 $('groupCount').textContent=uniq(visibleRows.map(r=>r.group)).length;
 renderCharts(visibleRows);
 $('tableContainer').innerHTML=tableHtml(visibleRows,cols);
 $('rowCount').textContent=`${visibleRows.length.toLocaleString('es-CO')} registros`;
 $('exportButton').disabled=!visibleRows.length;
 updateInactiveAndAlerts();
}
function calculateInactive(rows,referenceDate=new Date()){
 const ref=new Date(referenceDate.getFullYear(),referenceDate.getMonth(),referenceDate.getDate());
 return {
  inactive:rows.filter(r=>r._entryDate&&daysBetween(ref,r._entryDate)>90).map(r=>({...r,daysInactive:daysBetween(ref,r._entryDate),recommendation:'Revisar baja para liberar licencia'})).sort((a,b)=>b.daysInactive-a.daysInactive),
  missing:rows.filter(r=>!r._entryDate),
  future:rows.filter(r=>r._entryDate&&daysBetween(ref,r._entryDate)<0)
 };
}
function getAlerts(rows,ref=new Date()){
 const today=new Date(ref.getFullYear(),ref.getMonth(),ref.getDate()),out=[];
 rows.forEach(r=>{
  const base={...r};
  if(!r._validToDate)out.push({...base,severity:'Revisar',alert:'Sin fecha de fin de validez',recommendation:'Validar vigencia en SAP'});
  else {const days=daysBetween(r._validToDate,today);if(days<0)out.push({...base,severity:'Crítica',alert:'Validez vencida',recommendation:'Validar y regularizar'});else if(days<=30)out.push({...base,severity:'Advertencia',alert:`Vence en ${days} días`,recommendation:'Revisar renovación o baja'});}
  if(!r._entryDate)out.push({...base,severity:'Revisar',alert:'Sin fecha Entr.sist.',recommendation:'Verificar último ingreso'});
  else if(daysBetween(today,r._entryDate)<0)out.push({...base,severity:'Revisar',alert:'Entr.sist. posterior a la carga',recommendation:'Validar formato o dato'});
 });
 return out;
}
const inactiveCols=[['user','Usuario'],['group','Grupo'],['company','Empresa'],['id','ID / Licencia'],['contractType','Tipo contractual'],['systemEntry','Entr.sist.'],['daysInactive','Días sin ingreso'],['recommendation','Acción sugerida']];
const alertCols=[['severity','Prioridad'],['alert','Alerta'],['user','Usuario'],['group','Grupo'],['company','Empresa'],['id','ID / Licencia'],['validTo','Fin valid.'],['systemEntry','Entr.sist.'],['recommendation','Acción sugerida']];
function updateInactiveAndAlerts(){
 const ref=new Date(),res=calculateInactive(visibleRows,ref);
 inactiveRows=res.inactive;alertRows=getAlerts(visibleRows,ref);
 $('inactiveBadge').textContent=inactiveRows.length.toLocaleString('es-CO');
 $('alertBadge').textContent=alertRows.length.toLocaleString('es-CO');
 $('inactiveCount').textContent=inactiveRows.length.toLocaleString('es-CO');
 $('inactivePercent').textContent=percentLabel(pct(inactiveRows.length,visibleRows.length));
 $('missingEntryCount').textContent=res.missing.length.toLocaleString('es-CO');
 $('referenceDate').textContent=formatDate(ref);
 $('inactiveTable').innerHTML=tableHtml(inactiveRows,inactiveCols);
 $('exportInactiveButton').disabled=!inactiveRows.length;
 $('alertsTable').innerHTML=tableHtml(alertRows,alertCols);
 $('exportAlertsButton').disabled=!alertRows.length;
 const expired=alertRows.filter(a=>a.alert==='Validez vencida').length;
 const due=alertRows.filter(a=>a.alert.startsWith('Vence en')).length;
 const missing=alertRows.filter(a=>a.alert==='Sin fecha de fin de validez'||a.alert==='Sin fecha Entr.sist.').length;
 $('alertSummary').innerHTML=[
  ['red',expired,'Validez vencida','Revisar con el administrador SAP y confirmar si la cuenta debe seguir vigente.'],
  ['amber',due,'Vencimiento en próximos 30 días','Anticipar revisión de renovación, cambio o baja.'],
  ['green',missing,'Datos incompletos','Completar o verificar fechas antes de tomar decisiones.']
 ].map(([kind,n,title,desc])=>`<article class="alert-card ${kind}"><span class="alert-label">${title}</span><strong class="alert-count">${n.toLocaleString('es-CO')}</strong><p>${desc}</p></article>`).join('');
}
function exportCsv(rows,fields,filename){
 const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
 const content=[fields.map(([,label])=>quote(label)).join(';'),...rows.map(r=>fields.map(([f])=>quote(f==='daysInactive'?`${r[f]} días`:r[f]).replace(/\r?\n/g,' ')).join(';'))].join('\r\n');
 const blob=new Blob(['\ufeff'+content],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
}
function loadRows(raw,source){
 allRows=normalizeData(raw);refreshFilters();
 $('fileStatus').textContent=`${source}: ${allRows.length.toLocaleString('es-CO')} filas procesadas. Fecha de referencia: ${formatDate(new Date())}.`;
 updateMain();
}
$('excelFile').addEventListener('change',async e=>{
 const file=e.target.files[0];if(!file)return;
 try{if(!window.XLSX)throw new Error('No se cargó la biblioteca de Excel. Revisa la conexión a internet.');const bytes=await file.arrayBuffer();const wb=XLSX.read(bytes,{type:'array',cellDates:true});const ws=wb.Sheets[wb.SheetNames[0]];loadRows(XLSX.utils.sheet_to_json(ws,{defval:'',raw:false}),file.name)}
 catch(err){$('fileStatus').textContent=`No se pudo leer el archivo: ${err.message}`}
});
['companyFilter','groupFilter','idFilter'].forEach(id=>$(id).addEventListener('change',updateMain));
$('searchInput').addEventListener('input',updateMain);
$('clearFilters').addEventListener('click',()=>{['companyFilter','groupFilter','idFilter','searchInput'].forEach(id=>$(id).value='');updateMain()});
document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{
 document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b===btn));
 document.querySelectorAll('.tab-content').forEach(s=>s.classList.toggle('active',s.id===({overview:'overviewTab',inactive:'inactiveTab',alerts:'alertsTab'}[btn.dataset.tab])));
}));
$('exportButton').addEventListener('click',()=>exportCsv(visibleRows,cols,'medicion_licencias_sap.csv'));
$('exportInactiveButton').addEventListener('click',()=>exportCsv(inactiveRows,inactiveCols,'usuarios_sin_ingreso_90_dias.csv'));
$('exportAlertsButton').addEventListener('click',()=>exportCsv(alertRows,alertCols,'alertas_licencias_sap.csv'));
$('demoButton').addEventListener('click',()=>{
 const today=new Date(),dateAgo=n=>{const d=new Date(today);d.setDate(d.getDate()-n);return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`};
 const demo=[
  {Usuarios:'USR001',Nombre:'Ejemplo Ana',Apellido:'Café',ID:'CB','Tp.usuario contract.':'SAP Application Professional',Tipo:'A Diálogo',Grupo:'FNC_BOGOTA',EMPRESA:'FEDERACIÓN NACIONAL DE CAFETEROS','Md.':'500','Entr.sist.':dateAgo(12),'Válido de':dateAgo(300),'Fin valid.':dateAgo(-180)},
  {Usuarios:'USR002',Nombre:'Ejemplo Luis',Apellido:'Grano',ID:'FO','Tp.usuario contract.':'SAP Shop Floor User',Tipo:'A Diálogo',Grupo:'ALMACAFE_ADMIN',EMPRESA:'ALMACAFÉ','Md.':'500','Entr.sist.':dateAgo(105),'Válido de':dateAgo(400),'Fin valid.':dateAgo(14)},
  {Usuarios:'USR003',Nombre:'Ejemplo Sara',Apellido:'Montaña',ID:'AY','Tp.usuario contract.':'SAP ERP Limited Professional',Tipo:'A Diálogo',Grupo:'AGENC_PASTO',EMPRESA:'ALMACAFÉ','Md.':'500','Entr.sist.':dateAgo(240),'Válido de':dateAgo(500),'Fin valid.':dateAgo(7)},
  {Usuarios:'USR004',Nombre:'Ejemplo Juan',Apellido:'Taza',ID:'CC','Tp.usuario contract.':'SAP Application Limited Pro',Tipo:'A Diálogo',Grupo:'BUENCAFE',EMPRESA:'BUENCAFÉ','Md.':'500','Entr.sist.':dateAgo(5),'Válido de':dateAgo(100),'Fin valid.':dateAgo(-5)},
  {Usuarios:'USR005',Nombre:'Ejemplo Eva',Apellido:'Cosecha',ID:'AX','Tp.usuario contract.':'SAP ERP Professional',Tipo:'A Diálogo',Grupo:'PROCAFECOL',EMPRESA:'PROCAFECOL','Md.':'500','Entr.sist.':'','Válido de':dateAgo(200),'Fin valid.':dateAgo(-300)},
  {Usuarios:'USR006',Nombre:'Ejemplo Tomás',Apellido:'Sierra',ID:'CB','Tp.usuario contract.':'SAP Application Professional',Tipo:'A Diálogo',Grupo:'FNC_MANIZALES',EMPRESA:'FEDERACIÓN NACIONAL DE CAFETEROS','Md.':'500','Entr.sist.':dateAgo(91),'Válido de':dateAgo(600),'Fin valid.':dateAgo(80)}
 ];
 loadRows(demo,'Datos ficticios de demostración');
});
registerPlugin();
