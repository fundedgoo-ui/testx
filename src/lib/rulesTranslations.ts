export interface RulesTranslation {
  Title: string;
  Subtitle_Gate: string;
  Subtitle_Modal: string;
  Intro: string;
  R1_Title: string;
  R1_Desc: string;
  R2_Title: string;
  R2_Desc: string;
  R3_Title: string;
  R3_Desc: string;
  R4_Title: string;
  R4_Desc: string;
  R5_Title: string;
  R5_Desc: string;
  Btn_Reject: string;
  Btn_Accept: string;
  Btn_Close: string;
  Part1_Title: string;
  P1_Step1_Title: string;
  P1_Step1_Desc: string;
  P1_Step2_Title: string;
  P1_Step2_Desc: string;
  P1_Step3_Title: string;
  P1_Step3_Desc: string;
  Part2_Title: string;
  P2_Intro: string;
  P2_Bullet1: string;
  P2_Bullet2: string;
  P2_Bullet3: string;
  Restriction_Title: string;
  Restriction_Desc: string;
  Btn_GotIt: string;
  Btn_Proceed: string;
  StepRulesTitle: string;
  StepRulesSubtitle: string;
}

export const rulesTranslations: Record<'en' | 'es' | 'fr', RulesTranslation> = {
  en: {
    Title: "Market Analysis Guidelines",
    Subtitle_Gate: "Please accept the rules to access the forum",
    Subtitle_Modal: "Rules on posting, community validation, and conduct standards",
    Intro: "Welcome to the Market Analysis Forum. To maintain the highest educational quality and ensure a fair environment for everyone, you must read and accept the following forum rules:",
    R1_Title: "Authorized Publishing Only",
    R1_Desc: "Only officially approved platform mentors and active candidates under verification are permitted to publish chart setups. Standard traders can view, study, and cast validation votes.",
    R2_Title: "Single Daily Post Restriction",
    R2_Desc: "To keep the community stream highly focused and free of spam, authorized mentors and candidates are limited to publishing only one technical analysis setup every 24 hours.",
    R3_Title: "Community Validation System",
    R3_Desc: "Traders can vote on setups by clicking Correct or Incorrect buttons based on real-time price development. This democratic accuracy rating directly determines the mentor's public track-record score.",
    R4_Title: "Master Mentor Consistency Challenge",
    R4_Desc: "Candidates must post charts across at least 10 separate days with a community-voted accuracy rate of 60% or higher to automatically achieve the golden Master Mentor badge and list premium educational courses.",
    R5_Title: "STRICT CONDUCT & ZERO MANIPULATION RULE",
    R5_Desc: "All votes and reactions cast on forecast setups must be honest, authentic, and strictly match the actual price development. Any trader caught casting malicious or fake reactions (such as abusing votes to manipulate a mentor's accuracy score or bypass the candidate audit engine) will be flagged immediately and may be permanently banned from our platform.",
    Btn_Reject: "Reject & Exit",
    Btn_Accept: "Accept & Enter Forum",
    Btn_Close: "Accept & Close",
    Part1_Title: "Part 1: How to Become a Verified Mentor",
    P1_Step1_Title: "Submit Application",
    P1_Step1_Desc: "Click Become an Educator, complete your bio, pick your primary focus (SMC, Price Action, Algorithmic), and provide a verifiable public track-record link (e.g. MyFxBook, YouTube channel, or audited reports).",
    P1_Step2_Title: "Pay Processing Fee & Get Audited",
    P1_Step2_Desc: "Pay a one-time non-refundable administrative fee of $25 (payable from your balance or via card). The system then automatically provisions a special demo candidate evaluation account for you to start trading and prove your strategy.",
    P1_Step3_Title: "Consistency Audit & Badge Award",
    P1_Step3_Desc: "Our risk team monitors your live demo account logs. Once approved by admins, you receive the Platform Verified Mentor badge, unlocking your personal Mentor Cabinet to publish courses and educational files.",
    Part2_Title: "Part 2: Market Analysis Posting & Consistency Rules",
    P2_Intro: "Our Market Analysis page is a high-caliber technical forum. To prevent spam and maintain institutional-grade quality, the following rules apply:",
    P2_Bullet1: "Authorized Users Only: Only officially approved mentors and active candidates undergoing verification are allowed to publish forecast posts. Standard traders can only view setups, study charts, and vote.",
    P2_Bullet2: "Anti-Spam Limit (1 Post Per 24h): Authorized educators and candidates can publish only one technical analysis post every 24 hours.",
    P2_Bullet3: "The \"Master Mentor\" Badge Challenge: To unlock the prestigious, golden Master Mentor badge, you must publish market analysis forecasts on at least 10 different days and achieve a public correctness rate (win-rate) of at least 60% (where community votes for CORRECT exceed INCORRECT).",
    Restriction_Title: "CRITICAL ELIGIBILITY RESTRICTION",
    Restriction_Desc: "Anyone who becomes an authorized and verified mentor is no longer allowed to purchase prop accounts from us. Instead, mentors are eligible to monetize their audience by selling premium educational courses or by receiving an affiliate percentage of account sales through our standard network referral system.",
    Btn_GotIt: "Got it, close",
    Btn_Proceed: "I Accept - Proceed to Application",
    StepRulesTitle: "Accept Platform Guidelines",
    StepRulesSubtitle: "Please review and accept the mentor rules before applying"
  },
  es: {
    Title: "Directrices de Análisis de Mercado",
    Subtitle_Gate: "Por favor, acepte las normas para acceder al foro",
    Subtitle_Modal: "Normas sobre publicaciones, validación de la comunidad y conducta",
    Intro: "Bienvenido al Foro de Análisis de Mercado. Para mantener la más alta calidad educativa y garantizar un entorno justo para todos, debe leer y aceptar las siguientes normas del foro:",
    R1_Title: "Solo Publicación Autorizada",
    R1_Desc: "Solo los mentores aprobados de la plataforma y los candidatos activos bajo verificación tienen permitido publicar análisis gráficos. Los operadores estándar solo pueden ver, estudiar y votar la validación.",
    R2_Title: "Restricción de una Publicación Diaria",
    R2_Desc: "Para mantener el flujo de la comunidad altamente enfocado y libre de spam, los mentores y candidatos autorizados están limitados a publicar solo un análisis técnico cada 24 horas.",
    R3_Title: "Sistema de Validación de la Comunidad",
    R3_Desc: "Los operadores pueden votar los análisis haciendo clic en los botones Correcto o Incorrecto según el desarrollo del precio en tiempo real. Esta calificación democrática de precisión determina directamente la puntuación pública del mentor.",
    R4_Title: "Desafío de Consistencia de Master Mentor",
    R4_Desc: "Los candidatos deben publicar gráficos en al menos 10 días diferentes con una tasa de precisión votada por la comunidad del 60% o más para obtener automáticamente la insignia dorada de Master Mentor y publicar cursos educativos premium.",
    R5_Title: "CONDUCTA ESTRICTA Y REGLA DE CERO MANIPULACIÓN",
    R5_Desc: "Todos los votos y reacciones emitidos sobre los análisis deben ser honestos, auténticos y coincidir estrictamente con el desarrollo real del precio. Cualquier operador que sea sorprendido emitiendo votos maliciosos o falsos (como abusar de los votos para manipular la precisión de un mentor o eludir la evaluación de candidatos) será reportado de inmediato y podría ser expulsado permanentemente de nuestra plataforma.",
    Btn_Reject: "Rechazar y Salir",
    Btn_Accept: "Aceptar y Entrar al Foro",
    Btn_Close: "Aceptar y Cerrar",
    Part1_Title: "Parte 1: Cómo Convertirse en Mentor Verificado",
    P1_Step1_Title: "Enviar Solicitud",
    P1_Step1_Desc: "Haga clic en Convertirse en Educador, complete su biografía, elija su enfoque principal (SMC, Price Action, Algorítmico) y proporcione un enlace de registro público verificable (por ejemplo, MyFxBook, canal de YouTube o informes auditados).",
    P1_Step2_Title: "Pagar Tarifa de Procesamiento y Ser Auditado",
    P1_Step2_Desc: "Pague una tarifa administrativa única no reembolsable de $25 (pagadera con su saldo o tarjeta). El sistema le proporcionará automáticamente una cuenta de demostración especial para que empiece a operar y demuestre su estrategia.",
    P1_Step3_Title: "Auditoría de Consistencia y Entrega de Insignia",
    P1_Step3_Desc: "Nuestro equipo de riesgo supervisará el registro de su cuenta de demostración. Una vez aprobado por los administradores, recibirá la insignia de Mentor Verificado de la Plataforma, desbloqueando su Panel de Mentor para publicar cursos y recursos.",
    Part2_Title: "Parte 2: Normas de Publicación y Consistencia de Análisis",
    P2_Intro: "Nuestra página de Análisis de Mercado es un foro técnico de alto calibre. Para evitar el spam y mantener una calidad de nivel institucional, se aplican las siguientes reglas:",
    P2_Bullet1: "Solo usuarios autorizados: Solo los mentores aprobados oficialmente y los candidatos activos en proceso de verificación pueden publicar análisis. Los operadores estándar solo pueden ver análisis, estudiar gráficos y votar.",
    P2_Bullet2: "Límite anti-spam (1 publicación cada 24h): Los educadores y candidatos autorizados solo pueden publicar una propuesta técnica cada 24 horas.",
    P2_Bullet3: "El Desafío de la Insignia \"Master Mentor\": Para desbloquear la prestigiosa insignia dorada de Master Mentor, debe publicar análisis en al menos 10 días diferentes y lograr una precisión del 60% o más (votos de CORRECTO mayores a INCORRECTO).",
    Restriction_Title: "RESTRICCIÓN CRÍTICA DE ELEGIBILIDAD",
    Restriction_Desc: "Cualquier persona que se convierta en un mentor autorizado y verificado ya no podrá comprar cuentas de fondeo de prop firm con nosotros. En su lugar, los mentores pueden monetizar vendiendo cursos educativos premium o recibiendo comisiones de afiliados por ventas de cuentas a través de nuestro sistema de referidos.",
    Btn_GotIt: "Entendido, cerrar",
    Btn_Proceed: "Acepto - Continuar con la Solicitud",
    StepRulesTitle: "Aceptar Directrices de la Plataforma",
    StepRulesSubtitle: "Por favor, revise y acepte las normas de mentor antes de postularse"
  },
  fr: {
    Title: "Directives d'Analyse du Marché",
    Subtitle_Gate: "Veuillez accepter les règles pour accéder au forum",
    Subtitle_Modal: "Règles sur les publications, la validation communautaire et la conduite",
    Intro: "Bienvenue sur le Forum d'Analyse du Marché. Afin de maintenir la plus haute qualité éducative et de garantir un environnement équitable pour tous, vous devez lire et accepter les règles suivantes :",
    R1_Title: "Publication Autorisée Uniquement",
    R1_Desc: "Seuls les mentors officiellement approuvés de la plateforme et les candidats actifs en cours de vérification sont autorisés à publier des configurations graphiques. Les traders standard peuvent uniquement consulter, étudier et voter pour valider.",
    R2_Title: "Restriction d'une Seule Publication Quotidienne",
    R2_Desc: "Afin de maintenir le flux communautaire concentré et exempt de spam, les mentors et candidats autorisés sont limités à publier une seule analyse technique toutes les 24 heures.",
    R3_Title: "Système de Validation Communautaire",
    R3_Desc: "Les traders peuvent voter sur les configurations en cliquant sur les boutons Correct ou Incorrect en fonction de l'évolution des prix en temps réel. Cette note démocratique de précision détermine directement le score public du mentor.",
    R4_Title: "Défi de Constance Master Mentor",
    R4_Desc: "Les candidats doivent publier des graphiques sur au moins 10 jours distincts avec un taux de réussite de 60% ou plus pour obtenir automatiquement le badge doré de Master Mentor et lister des cours premium.",
    R5_Title: "RÈGLE DE CONDUITE STRICTE & ZÉRO MANIPULATION",
    R5_Desc: "Tous les votes et réactions exprimés sur les configurations doivent être honnêtes, authentiques et correspondre strictement à l'évolution réelle des prix. Tout trader pris en flagrant délit de votes malveillants ou falsifiés (comme abuser des votes pour manipuler le score de précision d'un mentor ou contourner l'audit des candidats) sera immédiatement signalé et pourra être banni définitivement de notre plateforme.",
    Btn_Reject: "Refuser et Quitter",
    Btn_Accept: "Accepter et Entrer au Forum",
    Btn_Close: "Accepter et Fermer",
    Part1_Title: "Partie 1: Comment Devenir un Mentor Vérifié",
    P1_Step1_Title: "Soumettre votre Candidature",
    P1_Step1_Desc: "Cliquez sur Devenir Éducateur, remplissez votre biographie, choisissez votre approche principale (SMC, Price Action, Algorithmique) et fournissez un lien de suivi public vérifiable (ex. MyFxBook, chaîne YouTube ou rapports audités).",
    P1_Step2_Title: "Payer les Frais de Traitement & Passer l'Audit",
    P1_Step2_Desc: "Payez des frais administratifs uniques non remboursables de 25 $ (payables depuis votre solde ou par carte). Le système mettra alors automatiquement à votre disposition un compte d'évaluation de démonstration pour commencer à trader.",
    P1_Step3_Title: "Audit de Constance & Attribution du Badge",
    P1_Step3_Desc: "Notre équipe des risques surveille les journaux de votre compte de démonstration. Une fois approuvé, vous recevez le badge de Mentor Vérifié de la Plateforme, débloquant votre Espace Mentor pour publier des cours.",
    Part2_Title: "Partie 2: Règles de Publication et de Constance de l'Analyse",
    P2_Intro: "Notre page d'Analyse du Marché est un forum technique de haut niveau. Pour éviter le spam et maintenir une qualité institutionnelle, les règles suivantes s'appliquent :",
    P2_Bullet1: "Utilisateurs autorisés uniquement: Seuls les mentors officiellement approuvés et les candidats actifs en cours de vérification peuvent publier. Les traders de base peuvent seulement consulter et voter.",
    P2_Bullet2: "Limite anti-spam (1 publication par 24h): Les éducateurs et candidats autorisés ne peuvent publier qu'un seul message d'analyse toutes les 24 heures.",
    P2_Bullet3: "Le Défi du Badge \"Master Mentor\": Pour débloquer le prestigieux badge en or Master Mentor, vous devez publier des prévisions sur au moins 10 jours différents et atteindre un taux de réussite de 60% ou plus.",
    Restriction_Title: "RESTRICTION CRITIQUE D'ÉLIGIBILITÉ",
    Restriction_Desc: "Toute personne devenant mentor agréé et vérifié n'est plus autorisée à acheter des comptes d'évaluation chez nous. Au lieu de cela, les mentors peuvent monétiser en vendant des cours premium ou en recevant des commissions d'affiliation.",
    Btn_GotIt: "Compris, fermer",
    Btn_Proceed: "J'accepte - Passer à la Candidature",
    StepRulesTitle: "Accepter les Directives",
    StepRulesSubtitle: "Veuillez examiner et accepter les règles de mentorat avant de postuler"
  }
};
