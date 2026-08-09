/* V5 client-facing layer: business language + distinct page patterns. */
(function(){
  const cleanScope={admin:'Toute l’école',prof:'Mes classes et mes cours',eleve:'Mon parcours scolaire',parent:'Mes enfants'};
  const cleanRole={admin:'Direction',prof:'Professeur',eleve:'Élève',parent:'Parent'};
  if(state.data?.auth){
    Object.entries(state.data.auth.roles).forEach(([k,v])=>{v.scope=cleanScope[k]||v.scope;v.label=cleanRole[k]||v.label});
    state.data.auth.users.forEach(u=>u.roleLabel=cleanRole[u.role]||u.roleLabel);
  }
  if(PAGE_META.users) PAGE_META.users=['Équipe & accès','Profils, comptes et responsabilités'];
  if(PAGE_META.ai) PAGE_META.ai=['Assistant de direction','Priorités, synthèses et actions suggérées'];
  if(PAGE_META.teacherAI) PAGE_META.teacherAI=['Assistant pédagogique','Préparer les activités et le suivi'];

  // Replace technical access strip with a simple, client-facing context cue.
  scopeStrip=function(resource,desc){
    const label=cleanScope[state.user.role]||'';
    return `<div class="client-context">${icon('i-eye')}<strong>${label}</strong><span>${desc||''}</span></div>`;
  };
  pageHeader=function(resource,title,desc,actions=''){
    return `${scopeStrip(resource,'')}<div class="page-intro"><div><h2>${title}</h2><p>${desc}</p></div><div class="intro-actions">${actions}</div></div>`;
  };

  const originalApply=applyUserUI;
  applyUserUI=function(){
    originalApply();
    const cfg=roleConfig();
    $('#sideRole').textContent=cfg.label;
    $('#scopeCard').innerHTML=`<strong>${cfg.label}</strong><span>${cfg.scope}</span>`;
    $('#topProfile').innerHTML=`<span class="avatar">${state.user.initials}</span><div><strong>${state.user.name}</strong><small>${cfg.label}</small></div>`;
  };

  function renderAdmissionsV5(){
    const rows=state.data.admissions;
    const stages=[['À valider','À examiner'],['Pièce manquante','À compléter'],['Dossier complet','Prêt à inscrire'],['Validé','Inscrits']];
    $('#content').innerHTML=`${pageHeader('admissions','Admissions','Suivez chaque demande depuis le premier contact jusqu’à l’inscription.',`<button class="btn btn-primary" data-action="new-admission">${icon('i-plus')}Nouvelle demande</button>`)}
      <div class="admission-board">${stages.map(([status,label])=>{const list=rows.filter(a=>a.status===status);return `<section class="admission-column"><div class="admission-column-head"><strong>${label}</strong><span>${list.length}</span></div>${list.map(a=>`<article class="admission-ticket"><small>${a.id} · ${a.requestedClass}</small><h4>${a.name}</h4><p>Responsable : ${a.guardian}<br/>Dossier complété à ${a.completion}%</p><div class="progress-line"><i style="width:${a.completion}%"></i></div><footer>${statusBadge(a.status)}<button class="btn btn-sm" data-admission="${a.id}">Ouvrir</button></footer></article>`).join('')||'<p class="muted" style="font-size:11px;padding:8px">Aucun dossier.</p>'}</section>`}).join('')}</div>`;
    bindPageActions();
  }

  function renderStudentsV5(){
    const students=state.data.students;
    const cards=list=>list.map(s=>`<article class="card student-tile"><div class="student-tile-head"><span class="avatar">${s.initials}</span><div><strong>${s.name}</strong><small>${s.classKey} · ${s.id}</small></div>${statusBadge(s.status)}</div><div class="student-stat-row"><div><b>${s.attendance}%</b><span>Présence</span></div><div><b>${s.balance?money(s.balance):'À jour'}</b><span>Frais</span></div><div><b>${state.data.grades.find(g=>g.studentId===s.id)?average(state.data.grades.find(g=>g.studentId===s.id))+'/20':'—'}</b><span>Moyenne</span></div></div><div class="student-tile-actions"><button class="btn" data-student="${s.id}">Voir le dossier</button><button class="icon-action" data-edit-student="${s.id}" title="Modifier">${icon('i-edit')}</button></div></article>`).join('');
    $('#content').innerHTML=`${pageHeader('students','Élèves','Retrouvez rapidement un élève et ouvrez sa fiche complète.',`<button class="btn" id="exportStudents">${icon('i-download')}Exporter la liste</button><button class="btn btn-primary" data-action="new-student">${icon('i-plus')}Ajouter un élève</button>`)}<div class="directory-toolbar"><div class="filters"><input class="filter-input" id="studentFilter" placeholder="Nom, identifiant…"><select class="filter-select" id="classFilter"><option value="">Toutes les classes</option>${[...new Set(students.map(s=>s.classKey))].sort().map(c=>`<option>${c}</option>`).join('')}</select></div><span id="directoryCount" class="directory-count">${students.length} élèves</span></div><div id="studentDirectory" class="student-directory">${cards(students)}</div>`;
    function filter(){const q=$('#studentFilter').value.toLowerCase(),c=$('#classFilter').value;const list=students.filter(s=>(!q||`${s.name} ${s.id}`.toLowerCase().includes(q))&&(!c||s.classKey===c));$('#studentDirectory').innerHTML=cards(list);$('#directoryCount').textContent=`${list.length} élève${list.length>1?'s':''}`;bindPageActions()}
    $('#studentFilter').oninput=filter;$('#classFilter').onchange=filter;$('#exportStudents').onclick=()=>{const csv=['ID;Nom;Classe;Email;Solde',...students.map(s=>[s.id,s.name,s.classKey,s.email,s.balance].join(';'))].join('\n');exportText('liste-eleves.csv',csv);toast('Liste exportée','Le fichier est prêt')};bindPageActions();
  }

  function renderAttendanceAdminV5(){
    const classes=state.data.classes.slice(0,6).map((c,i)=>({...c,rate:[96,93,95,89,94,97][i]||94,abs:[1,2,1,4,2,1][i]||1,late:[2,1,0,3,1,1][i]||0}));
    $('#content').innerHTML=`${pageHeader('attendanceAdmin','Présences','Repérez en un coup d’œil les classes qui nécessitent une attention.')}<div class="class-attendance-grid">${classes.map(c=>`<article class="card attendance-class-card"><div class="ring" style="--p:${c.rate}"><strong>${c.rate}%</strong></div><h3>${c.name}</h3><p>${c.teacher} · ${c.students} élèves</p><div class="attendance-class-footer"><span>${c.abs} absent${c.abs>1?'s':''}</span><span>${c.late} retard${c.late>1?'s':''}</span></div><button class="btn" style="width:100%;margin-top:14px" data-go="students">Voir la classe</button></article>`).join('')}</div>`;bindPageActions();
  }

  function renderAssignmentsAdminV5(){
    const as=state.data.assignments;
    $('#content').innerHTML=`${pageHeader('assignmentsAdmin','Devoirs','Suivez la remise des travaux par classe et identifiez les retards.')}<div class="assignment-board">${as.map(a=>{const pct=Math.round(a.submitted/a.total*100);return `<article class="card assignment-summary"><div class="assignment-topline"><span class="subject-tag">${a.class}</span>${statusBadge(a.status)}</div><h3>${a.title}</h3><p>${a.subject} · échéance ${a.dueDate.split('-').reverse().join('/')}</p><div class="submission-meter"><div class="progress-line"><i style="width:${pct}%"></i></div><strong>${pct}%</strong></div><small class="muted">${a.submitted} remis sur ${a.total}</small></article>`}).join('')}</div>`;
  }

  function renderUsersV5(){
    const profiles={
      admin:{title:'Direction',desc:'Pilote l’établissement et supervise les opérations.',items:['Admissions et dossiers élèves','Finance et rapports','Organisation de l’école','Comptes utilisateurs']},
      prof:{title:'Professeur',desc:'Travaille uniquement avec ses classes et ses matières.',items:['Planning personnel','Appel et absences','Notes et devoirs','Messages aux classes']},
      eleve:{title:'Élève',desc:'Suit son propre parcours scolaire.',items:['Cours et emploi du temps','Devoirs et remises','Résultats personnels','Annonces de l’école']},
      parent:{title:'Parent',desc:'Suit les enfants rattachés à son compte.',items:['Résultats et présences','Frais et reçus','Documents scolaires','Demandes à l’école']}
    };
    $('#content').innerHTML=`${pageHeader('users','Équipe & accès','Chaque utilisateur dispose d’un espace adapté à ses responsabilités.',`<button class="btn btn-primary" id="newUser">${icon('i-plus')}Ajouter un compte</button>`)}<div class="access-profile-grid">${Object.entries(profiles).map(([role,p])=>`<article class="card access-profile"><span class="mini-avatar ${role}">${role==='admin'?'ZA':role==='prof'?'KM':role==='eleve'?'AB':'MB'}</span><h3>${p.title}</h3><p>${p.desc}</p><div class="access-list">${p.items.map(x=>`<span>${x}</span>`).join('')}</div></article>`).join('')}</div><section class="card card-pad" style="margin-top:16px"><div class="card-head" style="padding:0"><div><h3>Comptes actifs</h3><p>Utilisateurs actuellement configurés pour l’école</p></div></div><div class="account-list">${state.data.auth.users.map(u=>`<div class="account-card"><span class="mini-avatar ${u.role}">${u.initials}</span><div><strong>${u.name}</strong><small>${u.email} · ${cleanRole[u.role]}</small></div>${badge('Actif','green')}<button class="btn btn-sm">Gérer</button></div>`).join('')}</div></section>`;$('#newUser').onclick=()=>toast('Nouveau compte','Choisissez le profil et renseignez l’utilisateur')}

  function renderFinanceV5(){
    const d=state.data.dashboard,payments=state.data.finance.payments.slice().reverse(),debts=state.data.students.filter(s=>s.balance>0).sort((a,b)=>b.balance-a.balance);
    $('#content').innerHTML=`${pageHeader('finance','Frais & paiements','Suivez les encaissements et les familles à relancer.',`<button class="btn btn-primary" id="newPayment">${icon('i-plus')}Enregistrer un paiement</button>`)}<div class="money-grid grid"><article class="money-card"><span>Encaissé</span><strong>${money(d.paidAmount)}</strong><small>Année en cours</small></article><article class="money-card"><span>À encaisser</span><strong>${money(d.pendingAmount)}</strong><small>Échéances ouvertes</small></article><article class="money-card"><span>Familles à relancer</span><strong>${debts.length}</strong><small>Solde restant</small></article><article class="money-card"><span>Recouvrement</span><strong>75,5%</strong><small>Objectif 90%</small></article></div><div class="collection-layout" style="margin-top:16px"><section class="card card-pad"><div class="card-head" style="padding:0"><div><h3>Derniers encaissements</h3><p>Une lecture rapide des mouvements récents</p></div></div><div class="invoice-stream">${payments.slice(0,6).map(p=>{const s=studentById(p.studentId);return `<div class="invoice-card"><div><h4>${s?.name||p.studentId}</h4><p>${p.description} · ${p.method} · ${p.date}</p></div><div class="amount"><strong>${money(p.amount)}</strong><small>${p.id}</small></div></div>`}).join('')}</div></section><section class="card card-pad"><div class="card-head" style="padding:0"><div><h3>Relances prioritaires</h3><p>Soldes les plus élevés</p></div></div><div class="mini-list">${debts.slice(0,6).map(s=>`<div class="mini-row"><span class="avatar">${s.initials}</span><div><strong>${s.name}</strong><small>${s.classKey}</small></div><strong>${money(s.balance)}</strong></div>`).join('')}</div></section></div>`;$('#newPayment').onclick=openPayment;
  }

  function renderParentFinanceV5(){
    const kids=parentChildren(),pays=state.data.finance.payments.filter(p=>state.user.childIds.includes(p.studentId)).slice().reverse(),due=kids.reduce((a,s)=>a+s.balance,0);
    $('#content').innerHTML=`${pageHeader('parentFinance','Frais & paiements','Consultez le solde familial et retrouvez chaque reçu.')}<div class="collection-layout"><aside class="family-balance"><span>Solde familial</span><h2>${money(due)}</h2><p style="color:#d6deea;font-size:12px;line-height:1.6">Les frais de vos enfants sont regroupés dans un seul espace.</p>${due?'<button class="btn btn-primary" id="parentPay">Régler maintenant</button>':'<button class="btn" disabled>Tout est à jour</button>'}</aside><section class="card card-pad"><div class="card-head" style="padding:0"><div><h3>Historique des paiements</h3><p>Reçus disponibles immédiatement</p></div></div><div class="invoice-stream">${pays.map(p=>`<div class="invoice-card"><div><h4>${studentById(p.studentId)?.name}</h4><p>${p.description} · ${p.date}</p></div><div class="amount"><strong>${money(p.amount)}</strong><button class="btn btn-sm" data-receipt="${p.id}">Reçu</button></div></div>`).join('')}</div></section></div>`;if($('#parentPay'))$('#parentPay').onclick=()=>toast('Paiement prêt','Choisissez votre moyen de paiement');$$('[data-receipt]').forEach(b=>b.onclick=()=>toast('Reçu disponible','Le document est prêt'));
  }

  function renderReportsV5(){
    const isAdmin=state.user.role==='admin';
    const reports=isAdmin?[
      ['i-users','Effectifs & admissions','Évolution des inscriptions, répartition par niveau et capacité des classes.'],['i-wallet','Frais & encaissements','Paiements reçus, soldes ouverts et suivi des échéances.'],['i-check','Présence scolaire','Assiduité par classe, absences et retards.'],['i-award','Résultats scolaires','Moyennes, progression et synthèse par matière.'],['i-chart','Synthèse de direction','Vue consolidée des principaux indicateurs de l’établissement.'],['i-file','Documents périodiques','Listes, relevés et documents utiles à la direction.']
    ]:[['i-users','Mes classes','Effectifs et suivi de vos classes.'],['i-check','Présence','Absences et retards de vos élèves.'],['i-award','Progression','Résultats et évolution de vos classes.'],['i-clipboard','Devoirs','Remises et travaux en attente.']];
    $('#content').innerHTML=`${pageHeader('reports',isAdmin?'Rapports':'Suivi pédagogique',isAdmin?'Des rapports prêts à consulter ou à partager.':'Les indicateurs utiles à vos classes.')}<div class="report-library">${reports.map((r,i)=>`<article class="card report-library-card"><span class="report-icon">${icon(r[0])}</span><div><h3>${r[1]}</h3><p>${r[2]}</p><footer><button class="btn" data-view-report="${i}">Consulter</button><button class="btn btn-soft" data-export-report="${i}">${icon('i-download')}Exporter</button></footer></div></article>`).join('')}</div>`;$$('[data-view-report]').forEach(b=>b.onclick=()=>toast('Rapport ouvert','Les filtres sont prêts à être utilisés'));$$('[data-export-report]').forEach(b=>b.onclick=()=>{exportText('rapport.csv','Indicateur;Valeur\nPrésence;94.6%\nEffectif;61');toast('Rapport exporté','Le fichier est prêt')});
  }

  function renderStaffV5(){
    const rows=state.data.extras.staff;
    $('#content').innerHTML=`${pageHeader('staff','Personnel','Retrouvez les membres de l’équipe et leur fonction.',`<button class="btn btn-primary" id="staffAdd">${icon('i-plus')}Ajouter un membre</button>`)}<div class="people-grid">${rows.map(x=>`<article class="card person-card"><span class="avatar">${x.name.split(' ').map(y=>y[0]).join('').slice(0,2)}</span><h3>${x.name}</h3><p>${x.role} · ${x.department}</p><div class="presence"><span>Présence ce mois</span><strong>${x.attendance}%</strong></div></article>`).join('')}</div>`;$('#staffAdd').onclick=()=>toast('Ajouter un membre','Complétez le dossier du personnel')}

  RENDERERS.admissions=renderAdmissionsV5;
  RENDERERS.students=renderStudentsV5;
  RENDERERS.attendanceAdmin=renderAttendanceAdminV5;
  RENDERERS.assignmentsAdmin=renderAssignmentsAdminV5;
  RENDERERS.users=renderUsersV5;
  RENDERERS.finance=renderFinanceV5;
  RENDERERS.parentFinance=renderParentFinanceV5;
  RENDERERS.reports=renderReportsV5;
  RENDERERS.staff=renderStaffV5;

  // Rename navigation labels to business language.
  ROLE_NAV.admin.forEach(group=>group.items.forEach(item=>{
    if(item[0]==='ai')item[2]='Assistant de direction';
    if(item[0]==='users')item[2]='Équipe & accès';
    if(item[0]==='inventory')item[2]='Stock & boutique';
  }));
  ROLE_NAV.prof.forEach(group=>group.items.forEach(item=>{if(item[0]==='teacherAI')item[2]='Assistant pédagogique'}));

  // Remove leftover technical wording from client-visible notifications.
  const forbidden=[/\bRBAC\b/gi,/\bRLS\b/gi,/\bCRUD\b/gi,/\bD3\b/gi,/\bJSON\b/gi,/\bAPI\b/gi,/\bBDD\b/gi,/\blocalStorage\b/gi,/\bfrontend\b/gi,/\bbackend\b/gi,/\bscope\b/gi];
  function scrub(root=document.body){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
    while(node=walker.nextNode()){
      let t=node.nodeValue;if(!t||!t.trim())continue;
      forbidden.forEach(rx=>t=t.replace(rx,''));
      t=t.replace(/\s{2,}/g,' ');
      node.nodeValue=t;
    }
  }
  const obs=new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1)scrub(n)})));obs.observe(document.body,{childList:true,subtree:true});scrub();

  // Refresh current page once overrides are installed.
  if(state.user){applyUserUI();navigate(state.page||'dashboard')}
})();
