/*
 * Contenu de l'application : espèces, parcours de diagnostic, fiches de
 * premiers secours, liste des toxiques et contacts d'urgence.
 *
 * Parcours : chaque symptôme possède un nœud de départ (`start`) et une table
 * de nœuds (`nodes`). Un nœud est soit une question (`q` + `answers`), soit un
 * résultat (`level` + `title` …). `next` désigne un nœud du même symptôme ou
 * un résultat partagé de COMMON_RESULTS.
 *
 * Niveaux : "urgence"    -> partir / appeler tout de suite
 *           "rapide"     -> consulter dans la journée (sous 24 h)
 *           "surveiller" -> soins à la maison et surveillance
 */

const SPECIES = [
  { id: "chien", label: "Chien", emoji: "🐕" },
  { id: "chat", label: "Chat", emoji: "🐈" },
  { id: "lapin", label: "Lapin / rongeur", emoji: "🐇" },
];

const LEVELS = {
  urgence: { label: "Urgence", hint: "Appelez un vétérinaire et partez maintenant" },
  rapide: { label: "Consultation rapide", hint: "Voir un vétérinaire dans la journée" },
  surveiller: { label: "Surveillance", hint: "Soins à la maison, surveillez l'évolution" },
};

// Signes de gravité vérifiés avant chaque parcours, quel que soit le symptôme.
const RED_FLAGS = [
  "Inconscient, ne réagit pas quand on l'appelle ou le touche",
  "Ne respire pas, ou respire avec beaucoup de difficulté",
  "Gencives ou langue blanches, grises ou bleues",
  "Saignement abondant qui ne s'arrête pas",
  "Convulsions de plus de 5 minutes ou qui se répètent",
  "Ventre gonflé et dur, avec des efforts pour vomir sans rien rejeter",
  "S'effondre, ne tient plus debout",
];

const NO_HUMAN_MEDS =
  "Ne donnez aucun médicament humain (paracétamol, ibuprofène, aspirine, anti-diarrhéique…) : plusieurs sont mortels pour les animaux, surtout le chat.";

const COMMON_RESULTS = {
  vital: {
    level: "urgence",
    title: "Urgence vitale : partez immédiatement chez un vétérinaire",
    summary:
      "Les signes décrits peuvent mettre la vie de votre animal en jeu en quelques minutes ou quelques heures. Chaque minute compte.",
    actions: [
      "Appelez votre vétérinaire ou le vétérinaire de garde pendant que vous vous préparez à partir, pour qu'on vous attende.",
      "S'il ne respire pas et que son cœur ne bat plus, commencez la réanimation (voir la fiche « Réanimation cardio-pulmonaire ») et continuez pendant le trajet si possible.",
      "Transportez-le calmement, à plat, dans une caisse ou sur une couverture tendue, en limitant ses mouvements.",
      "Gardez-le au chaud (sauf en cas de coup de chaleur), tête et cou bien droits pour dégager les voies respiratoires.",
    ],
    avoid: [
      "Ne lui donnez ni à boire ni à manger.",
      NO_HUMAN_MEDS,
      "Ne perdez pas de temps à chercher des remèdes sur Internet.",
    ],
    fiches: ["rcp", "transport", "constantes"],
  },
};

const SYMPTOMS = [
  // ---------------------------------------------------------------------------
  {
    id: "digestif",
    label: "Vomissements ou diarrhée",
    icon: "🤢",
    species: ["chien", "chat"],
    start: "sang",
    nodes: {
      sang: {
        q: "Y a-t-il du sang dans les vomissements ou dans les selles ?",
        help: "Rouge vif, ou noir et collant, ou aspect « marc de café ».",
        answers: [
          { label: "Oui", next: "urgent" },
          { label: "Non", next: "objet" },
        ],
      },
      objet: {
        q: "A-t-il pu avaler un objet, un os, un jouet, une ficelle ou un produit toxique ?",
        help: "Chez le chat, un fil ou une ficelle qui dépasse de la bouche ou de l'anus est une urgence : ne tirez jamais dessus.",
        answers: [
          { label: "Oui, ou c'est probable", next: "corps_etranger" },
          { label: "Non / je ne sais pas", next: "repete" },
        ],
      },
      repete: {
        q: "Vomit-il de façon répétée (plus de 3 fois en quelques heures) ou ne garde-t-il même pas l'eau ?",
        answers: [
          { label: "Oui", next: "urgent" },
          { label: "Non", next: "fragile" },
        ],
      },
      fragile: {
        q: "Est-il très abattu, a-t-il mal au ventre, ou est-ce un jeune (chiot, chaton), un animal âgé ou atteint d'une maladie chronique ?",
        help: "Douleur au ventre : il se courbe, gémit, refuse qu'on le touche, prend la « position de prière » (avant au sol, arrière levé).",
        answers: [
          { label: "Oui", next: "rapide" },
          { label: "Non", next: "duree" },
        ],
      },
      duree: {
        q: "Depuis combien de temps ?",
        answers: [
          { label: "Moins de 24 heures", next: "surveiller" },
          { label: "Plus de 24 heures", next: "rapide" },
        ],
      },
      urgent: {
        level: "urgence",
        title: "Consultez un vétérinaire en urgence",
        summary:
          "Du sang ou des vomissements répétés peuvent signaler une hémorragie digestive, une intoxication, une occlusion ou une déshydratation rapide.",
        actions: [
          "Appelez votre vétérinaire ou le vétérinaire de garde maintenant.",
          "Prenez une photo des vomissements ou des selles, ou apportez un échantillon.",
          "Notez depuis quand les signes ont commencé et combien de fois il a vomi.",
        ],
        avoid: ["Ne donnez pas à manger en attendant.", NO_HUMAN_MEDS],
        fiches: ["transport", "constantes"],
      },
      corps_etranger: {
        level: "urgence",
        title: "Suspicion d'objet avalé : consultez en urgence",
        summary:
          "Un objet peut bloquer ou perforer l'intestin. Une radiographie ou une échographie est souvent nécessaire, et le retrait est plus simple s'il est fait tôt.",
        actions: [
          "Appelez votre vétérinaire et décrivez ce qui a pu être avalé (apportez un objet identique ou l'emballage si possible).",
          "S'il s'agit d'un produit toxique, suivez aussi le parcours « A avalé quelque chose de toxique ».",
        ],
        avoid: [
          "Ne le faites pas vomir vous-même (sel, eau oxygénée, doigts dans la gorge) : c'est dangereux.",
          "Ne tirez jamais sur un fil, une ficelle ou un élastique qui dépasse.",
          "Ne donnez pas d'huile, de lait ou de mie de pain « pour faire passer ».",
        ],
        fiches: ["transport"],
      },
      rapide: {
        level: "rapide",
        title: "Consultez un vétérinaire dans la journée",
        summary:
          "Les jeunes, les animaux âgés ou malades et ceux qui souffrent se déshydratent et s'affaiblissent vite. Un examen est conseillé sans attendre plusieurs jours.",
        actions: [
          "Prenez rendez-vous aujourd'hui avec votre vétérinaire.",
          "Laissez de l'eau fraîche à disposition, en petites quantités répétées.",
          "Notez la fréquence et l'aspect des vomissements ou des selles.",
        ],
        avoid: [NO_HUMAN_MEDS],
        watch: [
          "S'il apparaît du sang, une forte fatigue ou un ventre gonflé : c'est une urgence.",
        ],
        fiches: ["constantes"],
      },
      surveiller: {
        level: "surveiller",
        title: "Soins à la maison et surveillance",
        summary:
          "Un épisode court, sans signe de gravité, chez un adulte en forme est souvent lié à un écart alimentaire et passe en 24 à 48 heures.",
        actions: [
          "Chien adulte : retirez la nourriture 6 à 12 heures. Chat : ne dépassez pas quelques heures de diète, le jeûne prolongé est dangereux pour lui.",
          "Laissez de l'eau fraîche à disposition, en petites quantités souvent.",
          "Reprenez ensuite une alimentation légère en petites portions (riz bien cuit et poulet sans peau, ou aliment digestif vétérinaire), puis revenez progressivement à l'alimentation habituelle sur 2 à 3 jours.",
        ],
        avoid: [NO_HUMAN_MEDS, "Ne donnez pas de lait."],
        watch: [
          "Consultez si les signes durent plus de 24 à 48 heures, s'aggravent, ou si apparaissent du sang, un abattement ou un refus de boire.",
        ],
      },
    },
  },

  // ---------------------------------------------------------------------------
  {
    id: "toxique",
    label: "A avalé ou touché quelque chose de toxique",
    icon: "☠️",
    species: ["chien", "chat", "lapin"],
    start: "signes",
    nodes: {
      signes: {
        q: "Présente-t-il déjà des signes : tremblements, convulsions, bave abondante, démarche ivre, vomissements répétés, difficulté à respirer, abattement ?",
        answers: [
          { label: "Oui", next: "tox_vital" },
          { label: "Non, pas encore", next: "produit" },
        ],
      },
      produit: {
        q: "De quel produit s'agit-il ?",
        help: "Même sans aucun signe, de nombreux toxiques agissent avec plusieurs heures ou jours de retard.",
        answers: [
          { label: "Chocolat, café, thé", next: "tox_chocolat" },
          { label: "Raisin, raisins secs", next: "tox_raisin" },
          { label: "Xylitol (chewing-gum, bonbons « sans sucre »)", next: "tox_xylitol" },
          { label: "Oignon, ail, poireau, échalote", next: "tox_allium" },
          { label: "Médicament humain", next: "tox_medicament" },
          { label: "Raticide, anti-limaces, antigel", next: "tox_raticide" },
          { label: "Lys ou autre plante", next: "tox_plante" },
          { label: "Antiparasitaire pour chien mis sur un chat", next: "tox_permethrine" },
          { label: "Autre / je ne sais pas", next: "tox_autre" },
        ],
      },
      tox_vital: {
        level: "urgence",
        title: "Intoxication avec signes : urgence vitale",
        summary:
          "Des signes nerveux, respiratoires ou digestifs après une exposition à un toxique demandent un traitement immédiat.",
        actions: [
          "Partez tout de suite chez le vétérinaire le plus proche et appelez-le en route.",
          "Emportez l'emballage, l'étiquette ou un morceau de la plante / du produit.",
          "Notez l'heure de l'exposition, la quantité estimée et le poids de l'animal.",
          "Si le produit est sur le pelage, empêchez l'animal de se lécher (enveloppez-le dans une serviette).",
        ],
        avoid: [
          "Ne le faites pas vomir vous-même : sel, eau oxygénée ou moutarde peuvent aggraver l'intoxication, et vomir est dangereux s'il somnole ou convulse.",
          "Ne donnez ni lait, ni huile, ni charbon sans avis vétérinaire.",
        ],
        fiches: ["transport", "rcp"],
      },
      tox_chocolat: {
        level: "urgence",
        title: "Chocolat : appelez immédiatement un vétérinaire",
        summary:
          "La théobromine et la caféine sont toxiques pour le chien et le chat. Plus le chocolat est noir, plus il est dangereux. Les signes (agitation, vomissements, cœur rapide, tremblements) apparaissent souvent 2 à 12 heures après.",
        actions: [
          "Appelez votre vétérinaire ou un centre antipoison vétérinaire avec : le type de chocolat (noir, au lait, à cuire), la quantité, l'heure et le poids de l'animal.",
          "Si l'ingestion date de moins de 2 heures, le vétérinaire peut le faire vomir en toute sécurité : n'attendez pas les signes.",
        ],
        avoid: ["Ne le faites pas vomir vous-même."],
        fiches: ["toxiques"],
      },
      tox_raisin: {
        level: "urgence",
        title: "Raisin : appelez immédiatement un vétérinaire",
        summary:
          "Chez le chien, même une petite quantité de raisin frais ou sec peut provoquer une insuffisance rénale aiguë. La sensibilité est imprévisible : aucune dose n'est considérée sans risque.",
        actions: [
          "Appelez votre vétérinaire tout de suite, même s'il n'en a mangé que quelques-uns.",
          "Le traitement (faire vomir, perfusion, contrôle des reins) est d'autant plus efficace qu'il est précoce.",
        ],
        avoid: ["Ne le faites pas vomir vous-même.", "N'attendez pas l'apparition de signes."],
        fiches: ["toxiques"],
      },
      tox_xylitol: {
        level: "urgence",
        title: "Xylitol : urgence, partez chez le vétérinaire",
        summary:
          "Le xylitol provoque chez le chien une chute brutale du sucre dans le sang en 30 à 60 minutes (faiblesse, tremblements, convulsions), puis parfois une atteinte grave du foie.",
        actions: [
          "Appelez et partez immédiatement chez le vétérinaire avec l'emballage.",
          "S'il devient faible en route et reste conscient, vous pouvez frotter un peu de miel ou de sirop sur ses gencives.",
        ],
        avoid: ["Ne le faites pas vomir vous-même."],
        fiches: ["toxiques", "transport"],
      },
      tox_allium: {
        level: "urgence",
        title: "Oignon / ail : appelez un vétérinaire",
        summary:
          "Crus, cuits ou en poudre, ces aliments détruisent les globules rouges (anémie). Le chat y est très sensible. Les signes (fatigue, gencives pâles, urines foncées) apparaissent souvent 1 à 5 jours après.",
        actions: [
          "Appelez votre vétérinaire en précisant la quantité, la forme (cru, cuit, poudre, plat cuisiné) et le poids de l'animal.",
          "Surveillez dans les jours suivants les gencives, l'énergie et la couleur des urines.",
        ],
        avoid: ["Ne le faites pas vomir vous-même."],
        fiches: ["toxiques", "constantes"],
      },
      tox_medicament: {
        level: "urgence",
        title: "Médicament humain : appelez immédiatement",
        summary:
          "Un seul comprimé de paracétamol peut tuer un chat. L'ibuprofène, l'aspirine, les antidépresseurs, les médicaments du cœur ou du TDAH sont dangereux pour le chien comme pour le chat.",
        actions: [
          "Appelez votre vétérinaire ou un centre antipoison vétérinaire avec la boîte : nom, dosage, nombre de comprimés manquants, heure.",
          "Suivez leurs consignes : un antidote ou un traitement précoce existe pour plusieurs médicaments.",
        ],
        avoid: ["Ne le faites pas vomir vous-même."],
        fiches: ["toxiques"],
      },
      tox_raticide: {
        level: "urgence",
        title: "Raticide, anti-limaces ou antigel : urgence absolue",
        summary:
          "L'antigel (éthylène glycol, au goût sucré) détruit les reins et ne se soigne que dans les toutes premières heures. Les anti-limaces provoquent des convulsions. Les raticides anticoagulants causent des hémorragies 3 à 5 jours plus tard, mais un antidote existe.",
        actions: [
          "Partez immédiatement chez le vétérinaire, même sans aucun signe.",
          "Emportez l'emballage : le nom de la substance active change complètement le traitement.",
        ],
        avoid: [
          "Ne le faites pas vomir vous-même.",
          "N'attendez pas de voir des signes : pour l'antigel, il est alors souvent trop tard.",
        ],
        fiches: ["toxiques", "transport"],
      },
      tox_plante: {
        level: "urgence",
        title: "Plante toxique : appelez un vétérinaire",
        summary:
          "Pour un chat, toutes les parties du lys (fleurs, feuilles, pollen, et même l'eau du vase) provoquent une insuffisance rénale mortelle. Le laurier-rose, le muguet, l'if ou le cycas sont aussi très dangereux pour toutes les espèces.",
        actions: [
          "Appelez votre vétérinaire ou un centre antipoison vétérinaire en nommant la plante (ou envoyez une photo).",
          "Chat et lys : partez directement chez le vétérinaire, le traitement doit commencer dans les premières heures.",
          "Retirez du pollen éventuel sur le pelage avec un linge humide pour éviter qu'il ne se lèche.",
        ],
        avoid: ["Ne le faites pas vomir vous-même."],
        fiches: ["toxiques"],
      },
      tox_permethrine: {
        level: "urgence",
        title: "Antiparasitaire pour chien sur un chat : urgence",
        summary:
          "De nombreux antiparasitaires pour chiens contiennent de la perméthrine, très toxique pour le chat : bave, tremblements, convulsions dans les heures qui suivent.",
        actions: [
          "Appelez immédiatement votre vétérinaire.",
          "S'il vous le conseille, lavez la zone avec de l'eau tiède et un savon doux (type liquide vaisselle doux), rincez abondamment, puis séchez-le bien et gardez-le au chaud.",
          "Empêchez-le de se lécher.",
        ],
        avoid: ["N'utilisez pas d'eau froide : le chat risque de se refroidir."],
        fiches: ["toxiques", "transport"],
      },
      tox_autre: {
        level: "urgence",
        title: "Produit inconnu ou autre : demandez un avis tout de suite",
        summary:
          "Beaucoup de produits ménagers, cosmétiques, huiles essentielles, drogues ou aliments sont toxiques. Un professionnel peut vous dire en quelques minutes si c'est grave.",
        actions: [
          "Appelez votre vétérinaire ou un centre antipoison vétérinaire (numéros dans l'onglet « Urgences »).",
          "Préparez l'emballage, la quantité estimée, l'heure et le poids de l'animal.",
          "Produit sur la peau ou les yeux : rincez abondamment à l'eau tiède pendant 10 minutes.",
        ],
        avoid: [
          "Ne le faites pas vomir vous-même, surtout pour un produit corrosif (javel, détartrant, déboucheur) ou pétrolier.",
        ],
        fiches: ["toxiques"],
      },
    },
  },

  // ---------------------------------------------------------------------------
  {
    id: "respiration",
    label: "Respire mal, tousse, s'étouffe",
    icon: "🫁",
    species: ["chien", "chat", "lapin"],
    start: "cyanose",
    nodes: {
      cyanose: {
        q: "Les gencives ou la langue sont-elles bleues, grises ou très pâles, ou l'animal s'effondre-t-il ?",
        help: "Un chat ou un lapin qui respire la bouche ouverte est toujours en détresse.",
        answers: [
          { label: "Oui", next: "vital" },
          { label: "Non", next: "etouffe" },
        ],
      },
      etouffe: {
        q: "Semble-t-il s'étouffer, après avoir mangé ou joué ?",
        help: "Pattes à la bouche, haut-le-cœur, bruit aigu à l'inspiration, panique.",
        answers: [
          { label: "Oui", next: "etouffement" },
          { label: "Non", next: "chaleur" },
        ],
      },
      chaleur: {
        q: "Fait-il chaud, ou vient-il de faire un effort intense ?",
        help: "Halètement très fort, bave épaisse, langue très rouge.",
        answers: [
          { label: "Oui", next: "coup_chaleur" },
          { label: "Non", next: "repos" },
        ],
      },
      repos: {
        q: "Au repos, respire-t-il normalement, mange-t-il et reste-t-il actif, avec seulement une toux ou des éternuements ?",
        answers: [
          { label: "Oui", next: "toux" },
          { label: "Non, il respire vite ou fort au repos", next: "dyspnee" },
        ],
      },
      etouffement: {
        level: "urgence",
        title: "Étouffement : agissez maintenant",
        summary:
          "Un objet coincé dans la gorge peut empêcher l'air de passer. Si l'animal respire encore, emmenez-le sans attendre ; s'il ne respire plus, agissez sur place.",
        actions: [
          "S'il respire encore et reste conscient : gardez-le calme et partez immédiatement chez le vétérinaire.",
          "Si vous voyez l'objet et pouvez le saisir facilement, retirez-le avec précaution (attention aux morsures).",
          "S'il ne respire plus : réalisez les manœuvres de désobstruction (voir la fiche « Étouffement »), puis la réanimation si nécessaire.",
        ],
        avoid: [
          "N'enfoncez pas les doigts à l'aveugle dans la gorge : vous pourriez pousser l'objet plus loin.",
          "Ne tirez pas sur un fil ou un os coincé.",
        ],
        fiches: ["etouffement", "rcp"],
      },
      coup_chaleur: {
        level: "urgence",
        title: "Coup de chaleur probable : refroidissez et partez",
        summary:
          "Le coup de chaleur peut endommager les organes en quelques dizaines de minutes. Le refroidissement doit commencer tout de suite, puis l'animal doit être examiné.",
        actions: [
          "Mettez-le immédiatement à l'ombre, au frais, dans une pièce ventilée ou la voiture climatisée.",
          "Mouillez-le avec de l'eau fraîche (pas glacée), surtout le ventre, l'intérieur des cuisses, les aisselles et les pattes, et placez-le devant un ventilateur.",
          "Proposez de petites quantités d'eau fraîche s'il est conscient.",
          "Partez chez le vétérinaire en continuant à le refroidir pendant le trajet.",
        ],
        avoid: [
          "N'utilisez pas d'eau glacée ni de glaçons : les vaisseaux se contractent et la chaleur reste piégée.",
          "Ne le couvrez pas d'une serviette mouillée posée en continu : elle finit par garder la chaleur.",
        ],
        fiches: ["chaleur", "transport"],
      },
      dyspnee: {
        level: "urgence",
        title: "Respiration difficile au repos : consultez en urgence",
        summary:
          "Une respiration rapide, bruyante ou avec effort au repos peut venir du cœur, des poumons ou d'un épanchement dans le thorax.",
        actions: [
          "Appelez votre vétérinaire et partez maintenant.",
          "Comptez sa fréquence respiratoire au repos (nombre de mouvements du thorax en 30 secondes × 2) pour la lui communiquer.",
          "Transportez-le dans une position qu'il choisit lui-même, au calme et au frais, en le stressant le moins possible.",
        ],
        avoid: [
          "Ne le forcez pas à se coucher sur le côté et ne lui posez pas de muselière.",
          "N'appuyez pas sur son thorax.",
        ],
        fiches: ["constantes", "transport"],
      },
      toux: {
        level: "rapide",
        title: "Toux ou éternuements : consultez sous 24 à 48 heures",
        summary:
          "Toux de chenil, coryza du chat, allergie ou corps étranger dans le nez (épillet) : un examen permet d'identifier la cause.",
        actions: [
          "Prenez rendez-vous chez votre vétérinaire. Filmez une quinte de toux pour la lui montrer.",
          "Utilisez un harnais plutôt qu'un collier si votre chien tousse.",
          "Éternuements violents et soudains après une promenade dans les herbes : pensez à un épillet, consultez rapidement.",
          "Isolez-le des autres animaux en attendant (maladies contagieuses).",
        ],
        watch: [
          "Consultez en urgence si la respiration devient rapide au repos, si les gencives changent de couleur ou s'il ne mange plus.",
          "Chat : arrêter de manger plus de 24 heures en raison d'un nez bouché nécessite une consultation.",
        ],
        avoid: [NO_HUMAN_MEDS],
        fiches: ["constantes"],
      },
    },
  },

  // ---------------------------------------------------------------------------
  {
    id: "plaie",
    label: "Plaie, saignement, morsure",
    icon: "🩸",
    species: ["chien", "chat", "lapin"],
    start: "abondant",
    nodes: {
      abondant: {
        q: "Le saignement est-il abondant, en jet, ou ne s'arrête-t-il pas après 5 minutes de compression ?",
        answers: [
          { label: "Oui", next: "hemorragie" },
          { label: "Non", next: "profonde" },
        ],
      },
      profonde: {
        q: "La plaie est-elle profonde, longue de plus de 1 à 2 cm, due à une morsure, ou située sur l'œil, le thorax ou le ventre ?",
        help: "Les morsures (même petites en surface) s'infectent très souvent, surtout chez le chat.",
        answers: [
          { label: "Oui", next: "plaie_grave" },
          { label: "Non, c'est une petite plaie superficielle", next: "plaie_simple" },
        ],
      },
      hemorragie: {
        level: "urgence",
        title: "Hémorragie : comprimez et partez",
        summary:
          "Une perte de sang importante peut entraîner un état de choc. La compression est le geste qui sauve en attendant les soins.",
        actions: [
          "Appuyez fermement et en continu sur la plaie avec une compresse, un linge propre ou un vêtement, pendant au moins 5 minutes sans regarder.",
          "Si le sang traverse, ajoutez des couches par-dessus sans retirer les premières.",
          "Maintenez avec un bandage serré (sans couper la circulation) et partez chez le vétérinaire en continuant d'appuyer.",
          "Patte : surélevez-la si possible.",
        ],
        avoid: [
          "Ne posez pas de garrot sauf si on vous le demande : il peut entraîner la perte du membre.",
          "Ne retirez pas un objet planté dans la plaie : immobilisez-le avec des compresses autour.",
        ],
        fiches: ["bandage", "transport", "museliere"],
      },
      plaie_grave: {
        level: "rapide",
        title: "Plaie à faire examiner dans les heures qui viennent",
        summary:
          "Les plaies profondes et les morsures nécessitent souvent un nettoyage professionnel, des points de suture ou des antibiotiques. Idéalement dans les 6 heures.",
        actions: [
          "Rincez abondamment à l'eau tiède ou au sérum physiologique.",
          "Couvrez avec une compresse propre et un bandage léger.",
          "Plaie au thorax qui « aspire » de l'air : couvrez-la avec une compresse humide et un film alimentaire, et partez en urgence.",
          "Prenez rendez-vous aujourd'hui avec votre vétérinaire.",
        ],
        avoid: [
          "N'utilisez pas d'alcool, d'eau oxygénée pure ni de coton qui laisse des fibres.",
          "Empêchez-le de lécher la plaie (collerette, t-shirt).",
        ],
        fiches: ["bandage", "museliere"],
      },
      plaie_simple: {
        level: "surveiller",
        title: "Petite plaie : nettoyez et surveillez",
        summary:
          "Une égratignure ou une petite coupure superficielle cicatrise généralement seule en quelques jours si elle reste propre.",
        actions: [
          "Coupez les poils autour de la plaie avec des ciseaux à bouts ronds.",
          "Rincez à l'eau tiède ou au sérum physiologique, puis désinfectez avec un antiseptique adapté aux animaux (chlorhexidine diluée).",
          "Empêchez-le de lécher la plaie.",
        ],
        avoid: ["N'appliquez pas de crème ou de désinfectant humain sans avis (certains sont toxiques s'ils sont léchés)."],
        watch: [
          "Consultez si la zone devient rouge, chaude, gonflée, si elle suinte du pus, sent mauvais ou si l'animal a de la fièvre ou est abattu (abcès fréquent chez le chat).",
        ],
      },
    },
  },

  // ---------------------------------------------------------------------------
  {
    id: "trauma",
    label: "Chute, accident, boiterie",
    icon: "🦴",
    species: ["chien", "chat", "lapin"],
    start: "accident",
    nodes: {
      accident: {
        q: "A-t-il été heurté par un véhicule ou a-t-il fait une chute importante (balcon, fenêtre, escalier) ?",
        answers: [
          { label: "Oui", next: "trauma_grave" },
          { label: "Non", next: "fracture" },
        ],
      },
      fracture: {
        q: "La patte est-elle déformée, pend-elle anormalement, voit-on l'os, ou ne pose-t-il plus du tout la patte ?",
        answers: [
          { label: "Oui", next: "fracture_r" },
          { label: "Non", next: "dos" },
        ],
      },
      dos: {
        q: "A-t-il du mal à se lever, traîne-t-il les pattes arrière, ou crie-t-il quand on touche son dos ou son cou ?",
        answers: [
          { label: "Oui", next: "dos_r" },
          { label: "Non", next: "duree" },
        ],
      },
      duree: {
        q: "La boiterie dure-t-elle depuis plus de 24 à 48 heures, ou s'aggrave-t-elle ?",
        answers: [
          { label: "Oui", next: "boiterie_rapide" },
          { label: "Non, c'est récent et léger", next: "boiterie_legere" },
        ],
      },
      trauma_grave: {
        level: "urgence",
        title: "Après un accident : consultez en urgence, même s'il semble aller bien",
        summary:
          "Hémorragie interne, lésions pulmonaires (fréquentes chez le chat tombé d'un balcon) ou rupture d'organe peuvent se révéler plusieurs heures après le choc.",
        actions: [
          "Approchez-le calmement : un animal qui souffre peut mordre, même son maître. Posez une muselière improvisée s'il respire normalement.",
          "Transportez-le à plat sur une planche, un carton rigide ou une couverture tendue, en bougeant le moins possible son dos et son cou.",
          "Comprimez tout saignement et partez chez le vétérinaire.",
        ],
        avoid: [
          "Ne le laissez pas marcher, même s'il semble pouvoir le faire.",
          "Ne lui donnez rien à boire ni à manger, ni aucun antidouleur humain.",
        ],
        fiches: ["transport", "museliere", "bandage"],
      },
      fracture_r: {
        level: "urgence",
        title: "Fracture possible : immobilisez et partez",
        summary: "Une fracture est très douloureuse et une fracture ouverte risque de s'infecter. Elle doit être prise en charge rapidement.",
        actions: [
          "Limitez ses mouvements : placez-le dans une caisse ou portez-le en soutenant tout le corps.",
          "Fracture ouverte : couvrez l'os ou la plaie avec une compresse propre et humide, sans appuyer.",
          "Partez chez votre vétérinaire.",
        ],
        avoid: [
          "N'essayez pas de remettre l'os en place.",
          "Ne posez pas d'attelle si l'animal se débat : vous risquez d'aggraver la lésion.",
        ],
        fiches: ["transport", "museliere"],
      },
      dos_r: {
        level: "urgence",
        title: "Douleur du dos ou paralysie : urgence",
        summary:
          "Une hernie discale ou une lésion de la moelle épinière doit être traitée vite pour préserver la marche. Chez le chat, une paralysie brutale des pattes arrière avec pattes froides peut être une thrombose : urgence absolue.",
        actions: [
          "Gardez-le immobile, à plat, dans une caisse ou sur une planche.",
          "Appelez votre vétérinaire et partez maintenant.",
        ],
        avoid: ["Ne le soulevez pas par les pattes avant ou par la peau du cou.", "Ne le faites pas marcher pour « vérifier »."],
        fiches: ["transport"],
      },
      boiterie_rapide: {
        level: "rapide",
        title: "Boiterie persistante : consultez sous 24 heures",
        summary: "Une boiterie qui dure peut révéler une entorse, une rupture de ligament, une infection ou une douleur articulaire.",
        actions: [
          "Prenez rendez-vous chez votre vétérinaire. Filmez-le en train de marcher, cela aide au diagnostic.",
          "Gardez-le au repos strict (promenades courtes en laisse, pas de jeux ni de sauts).",
        ],
        avoid: [NO_HUMAN_MEDS],
      },
      boiterie_legere: {
        level: "surveiller",
        title: "Boiterie légère et récente : repos et surveillance",
        summary: "Une petite boiterie après un jeu ou une course disparaît souvent en 24 à 48 heures de repos.",
        actions: [
          "Vérifiez les coussinets, l'espace entre les doigts et les griffes : épillet, épine, coupure, griffe cassée ?",
          "Repos : promenades courtes en laisse, pas de sauts.",
          "Vous pouvez appliquer du froid (poche de glace entourée d'un linge) 10 minutes, 2 à 3 fois par jour, sur une zone gonflée.",
        ],
        avoid: [NO_HUMAN_MEDS],
        watch: [
          "Consultez si la boiterie ne s'améliore pas en 48 heures, s'aggrave, ou si la zone gonfle ou devient chaude.",
          "Un épillet entre les doigts doit être retiré par le vétérinaire s'il est enfoncé.",
        ],
      },
    },
  },

  // ---------------------------------------------------------------------------
  {
    id: "chaleur",
    label: "Coup de chaleur",
    icon: "🌡️",
    species: ["chien", "chat", "lapin"],
    start: "gravite",
    nodes: {
      gravite: {
        q: "Est-il effondré, confus, titube-t-il, vomit-il, a-t-il des gencives très rouges ou violacées, ou des convulsions ?",
        help: "Les chiens à museau court (bouledogue, carlin…), les animaux âgés, en surpoids et les lapins sont les plus à risque.",
        answers: [
          { label: "Oui", next: "chaleur_vital" },
          { label: "Non, il halète beaucoup mais reste conscient", next: "chaleur_urgent" },
        ],
      },
      chaleur_vital: {
        level: "urgence",
        title: "Coup de chaleur grave : urgence vitale",
        summary:
          "Au-delà de 41 °C, les organes sont endommagés en quelques minutes. Il faut refroidir immédiatement et partir chez le vétérinaire.",
        actions: [
          "Appelez le vétérinaire et partez en voiture climatisée, fenêtres ouvertes.",
          "Pendant ce temps, mouillez-le abondamment avec de l'eau fraîche (pas glacée), surtout le ventre, les aisselles, l'intérieur des cuisses et les pattes.",
          "Ventilez-le (ventilateur, carton) pour faire évaporer l'eau.",
        ],
        avoid: [
          "Pas d'eau glacée ni de glaçons.",
          "Ne le forcez pas à boire s'il est confus ou inconscient.",
          "Ne le laissez pas sous une serviette mouillée posée en continu.",
        ],
        fiches: ["chaleur", "rcp", "transport"],
      },
      chaleur_urgent: {
        level: "urgence",
        title: "Début de coup de chaleur : refroidissez puis consultez",
        summary:
          "Même si votre animal semble aller mieux après le refroidissement, des complications (reins, coagulation, intestin) peuvent survenir dans les heures qui suivent.",
        actions: [
          "Mettez-le immédiatement au frais et à l'ombre.",
          "Mouillez-le avec de l'eau fraîche et ventilez-le.",
          "Proposez de l'eau fraîche en petites quantités.",
          "Arrêtez de refroidir quand sa respiration se calme (ou à 39,5 °C si vous pouvez prendre la température), puis appelez votre vétérinaire pour un examen.",
        ],
        avoid: ["Pas d'eau glacée ni de glaçons.", "Plus d'effort ni de sortie au soleil aujourd'hui."],
        fiches: ["chaleur", "constantes"],
      },
    },
  },

  // ---------------------------------------------------------------------------
  {
    id: "convulsions",
    label: "Convulsions, tremblements",
    icon: "⚡",
    species: ["chien", "chat", "lapin"],
    start: "duree",
    nodes: {
      duree: {
        q: "La crise dure-t-elle plus de 5 minutes, ou les crises s'enchaînent-elles sans qu'il reprenne ses esprits entre deux ?",
        answers: [
          { label: "Oui", next: "conv_vital" },
          { label: "Non, la crise s'est arrêtée", next: "premiere" },
        ],
      },
      premiere: {
        q: "Est-ce sa première crise, a-t-il pu avaler un toxique, ou a-t-il eu plusieurs crises en 24 heures ?",
        answers: [
          { label: "Oui", next: "conv_urgent" },
          { label: "Non, il est épileptique connu et c'est une crise courte isolée", next: "conv_connu" },
        ],
      },
      conv_vital: {
        level: "urgence",
        title: "Crise prolongée : urgence vitale",
        summary:
          "Une crise de plus de 5 minutes ou des crises en série peuvent provoquer des lésions du cerveau et une hyperthermie. Un traitement par le vétérinaire est indispensable.",
        actions: [
          "Appelez le vétérinaire et partez dès que possible.",
          "Éloignez les objets dangereux, protégez sa tête avec un coussin, mettez la pièce dans la pénombre et au calme.",
          "Notez l'heure de début, filmez si possible.",
          "Transportez-le enveloppé dans une couverture, en gardant vos mains loin de sa bouche.",
        ],
        avoid: [
          "Ne mettez jamais vos mains ou un objet dans sa bouche : il ne peut pas « avaler sa langue », mais il peut vous mordre très fort sans le vouloir.",
          "Ne lui donnez rien à boire.",
        ],
        fiches: ["convulsions", "transport"],
      },
      conv_urgent: {
        level: "urgence",
        title: "Première crise ou crises répétées : consultez aujourd'hui sans attendre",
        summary:
          "Une première crise peut avoir de nombreuses causes (intoxication, baisse de sucre, maladie du foie, épilepsie…). Un bilan est nécessaire rapidement.",
        actions: [
          "Appelez votre vétérinaire tout de suite.",
          "Après la crise, il peut être désorienté, aveugle ou agité quelques minutes à quelques heures : gardez-le dans une pièce calme et sûre.",
          "Si un toxique est possible, emportez l'emballage.",
        ],
        avoid: ["Ne lui donnez rien à manger ni à boire tant qu'il n'est pas complètement réveillé."],
        fiches: ["convulsions"],
      },
      conv_connu: {
        level: "rapide",
        title: "Crise isolée chez un épileptique connu : prévenez votre vétérinaire",
        summary: "Une crise courte et unique chez un animal déjà suivi ne nécessite pas toujours une urgence, mais le traitement doit peut-être être ajusté.",
        actions: [
          "Notez la date, l'heure, la durée et la description de la crise dans un carnet.",
          "Vérifiez qu'il a bien pris son traitement.",
          "Appelez votre vétérinaire dans la journée.",
          "Si votre vétérinaire vous a prescrit un traitement d'urgence pour les crises, suivez son protocole.",
        ],
        watch: ["Une nouvelle crise dans les 24 heures ou une crise de plus de 5 minutes : urgence."],
        fiches: ["convulsions"],
      },
    },
  },

  // ---------------------------------------------------------------------------
  {
    id: "ventre",
    label: "Ventre gonflé, essaie de vomir sans rien rejeter",
    icon: "🎈",
    species: ["chien"],
    start: "torsion",
    nodes: {
      torsion: {
        q: "Le ventre est-il gonflé ou tendu, et essaie-t-il de vomir sans rien rejeter (ou seulement de la mousse), bave-t-il ou est-il agité ?",
        help: "Surtout chez les grands chiens à thorax profond (berger allemand, dogue, braque…), souvent après un repas.",
        answers: [
          { label: "Oui", next: "torsion_r" },
          { label: "Non, ventre un peu gonflé mais il est en forme", next: "gonfle" },
        ],
      },
      torsion_r: {
        level: "urgence",
        title: "Suspicion de torsion d'estomac : urgence absolue",
        summary:
          "La dilatation-torsion de l'estomac tue en quelques heures sans chirurgie. N'attendez pas que les signes s'aggravent.",
        actions: [
          "Partez immédiatement chez le vétérinaire le plus proche ouvert, en l'appelant en route.",
          "Portez-le ou faites-le marcher le moins possible.",
        ],
        avoid: [
          "Ne lui donnez ni eau ni nourriture.",
          "N'attendez pas « pour voir si ça passe ».",
        ],
        fiches: ["transport"],
      },
      gonfle: {
        level: "rapide",
        title: "Ventre gonflé sans signe de gravité : consultez sous 24 heures",
        summary:
          "Un ventre qui grossit progressivement peut être lié à du liquide, des parasites, une maladie hormonale ou une grossesse.",
        actions: ["Prenez rendez-vous avec votre vétérinaire.", "Notez s'il boit et urine plus, et s'il a perdu ou pris du poids."],
        watch: ["Efforts pour vomir, agitation, bave, faiblesse : partez en urgence."],
      },
    },
  },

  // ---------------------------------------------------------------------------
  {
    id: "urinaire",
    label: "Problème pour uriner",
    icon: "💧",
    species: ["chien", "chat"],
    start: "efforts",
    nodes: {
      efforts: {
        q: "Va-t-il souvent uriner en poussant sans rien produire ou seulement quelques gouttes, se lèche-t-il le bas-ventre ou miaule-t-il/gémit-il ?",
        answers: [
          { label: "Oui", next: "male" },
          { label: "Non", next: "autre" },
        ],
      },
      male: {
        q: "Est-ce un mâle, ou n'avez-vous vu aucune urine depuis plus de 12 heures ?",
        answers: [
          { label: "Oui", next: "obstruction" },
          { label: "Non, c'est une femelle qui urine un peu", next: "cystite" },
        ],
      },
      autre: {
        q: "Qu'observez-vous ?",
        answers: [
          { label: "Sang dans les urines, ou urine en dehors de sa litière / dans la maison", next: "cystite" },
          { label: "Boit et urine beaucoup plus que d'habitude", next: "polyurie" },
        ],
      },
      obstruction: {
        level: "urgence",
        title: "Risque de blocage urinaire : urgence vitale",
        summary:
          "Chez le mâle (surtout le chat), l'urètre peut se boucher. Sans soins, les reins cessent de fonctionner et le potassium monte dans le sang : le blocage peut être mortel en 24 à 72 heures.",
        actions: ["Partez immédiatement chez votre vétérinaire ou le vétérinaire de garde."],
        avoid: [
          "Ne lui appuyez pas sur le ventre pour essayer de le faire uriner.",
          "N'attendez pas le lendemain.",
        ],
        fiches: ["transport"],
      },
      cystite: {
        level: "rapide",
        title: "Inflammation urinaire probable : consultez dans la journée",
        summary:
          "Cystite, calculs ou infection : un examen d'urine permet d'adapter le traitement. Chez le chat, le stress est une cause fréquente.",
        actions: [
          "Prenez rendez-vous aujourd'hui.",
          "Si possible, récupérez un peu d'urine dans un pot propre (litière vide ou litière spéciale non absorbante) et conservez-la au réfrigérateur.",
          "Encouragez-le à boire (fontaine, eau dans la pâtée).",
        ],
        watch: ["S'il ne produit plus du tout d'urine, surtout un mâle : urgence."],
      },
      polyurie: {
        level: "rapide",
        title: "Soif et urines excessives : consultez sous quelques jours",
        summary:
          "Boire beaucoup plus peut révéler un diabète, une maladie des reins, une infection de l'utérus chez la femelle non stérilisée ou un trouble hormonal.",
        actions: [
          "Mesurez la quantité d'eau bue sur 24 heures et notez-la.",
          "Prenez rendez-vous avec votre vétérinaire, avec un échantillon d'urine si possible.",
        ],
        watch: [
          "Femelle non stérilisée, abattue, avec des pertes vulvaires ou des vomissements : consultez en urgence (risque d'infection de l'utérus).",
        ],
        avoid: ["Ne limitez pas son accès à l'eau."],
      },
    },
  },

  // ---------------------------------------------------------------------------
  {
    id: "lapin_digestif",
    label: "Ne mange plus, pas de crottes, diarrhée",
    icon: "🥕",
    species: ["lapin"],
    start: "stase",
    nodes: {
      stase: {
        q: "N'a-t-il rien mangé ou fait aucune crotte depuis plus de 8 à 12 heures, ou est-il prostré, en boule, ou grince-t-il des dents ?",
        help: "Chez le lapin, le cobaye ou le chinchilla, l'arrêt du transit est une urgence : il ne peut pas vomir et son intestin doit fonctionner en permanence.",
        answers: [
          { label: "Oui", next: "stase_r" },
          { label: "Non", next: "myiase" },
        ],
      },
      myiase: {
        q: "Voyez-vous des asticots, des œufs de mouche ou des souillures autour de l'anus ?",
        answers: [
          { label: "Oui", next: "myiase_r" },
          { label: "Non", next: "crottes" },
        ],
      },
      crottes: {
        q: "Les crottes sont-elles plus petites, moins nombreuses, ou y a-t-il une diarrhée ?",
        answers: [
          { label: "Diarrhée liquide", next: "stase_r" },
          { label: "Crottes plus petites ou moins nombreuses, il mange encore", next: "lapin_rapide" },
          { label: "Crottes molles et collantes (cæcotrophes) mais il est en forme", next: "lapin_surveiller" },
        ],
      },
      stase_r: {
        level: "urgence",
        title: "Arrêt digestif ou diarrhée : consultez en urgence",
        summary:
          "La stase digestive et la vraie diarrhée peuvent tuer un lapin en 24 à 48 heures. Un vétérinaire spécialisé en NAC doit l'examiner aujourd'hui.",
        actions: [
          "Appelez un vétérinaire qui soigne les NAC (lapins, rongeurs).",
          "Gardez-le au calme et au chaud (bouillotte tiède entourée d'un linge), sauf s'il fait très chaud.",
          "Proposez-lui du foin frais et des herbes fraîches, et de l'eau.",
        ],
        avoid: [
          "Ne le mettez jamais à la diète.",
          "Ne lui donnez pas de médicament pour humain ou pour chien/chat.",
          "Ne le baignez pas.",
        ],
        fiches: ["constantes", "transport"],
      },
      myiase_r: {
        level: "urgence",
        title: "Myiase (asticots) : urgence",
        summary:
          "Les larves de mouche dévorent la peau et les tissus en quelques heures. C'est fréquent l'été chez les lapins souillés, en surpoids ou âgés.",
        actions: [
          "Partez chez le vétérinaire immédiatement.",
          "En attendant, retirez les asticots visibles avec une pince à épiler.",
        ],
        avoid: ["Ne baignez pas le lapin (risque de choc et d'hypothermie)."],
        fiches: ["transport"],
      },
      lapin_rapide: {
        level: "rapide",
        title: "Ralentissement du transit : consultez dans la journée",
        summary: "Moins de crottes, c'est souvent le début d'une stase. Agir tôt évite l'urgence.",
        actions: [
          "Mettez à volonté du foin de bonne qualité et des herbes fraîches.",
          "Encouragez-le à bouger et à boire.",
          "Appelez votre vétérinaire NAC aujourd'hui, et faites contrôler ses dents (cause fréquente).",
        ],
        watch: ["S'il arrête complètement de manger ou de faire des crottes : urgence."],
        avoid: ["Ne supprimez pas la nourriture."],
      },
      lapin_surveiller: {
        level: "surveiller",
        title: "Cæcotrophes non consommés : revoyez l'alimentation",
        summary:
          "Les cæcotrophes sont des crottes molles normales que le lapin mange directement. S'il les laisse, c'est souvent dû à une alimentation trop riche ou à une difficulté à se pencher (surpoids, arthrose, dents).",
        actions: [
          "Basez l'alimentation sur le foin à volonté (80 % de la ration), quelques légumes verts, peu de granulés, pas de pain ni de friandises sucrées.",
          "Nettoyez délicatement la zone avec un linge humide et séchez bien.",
        ],
        watch: ["Consultez si cela persiste plus de quelques jours ou si son appétit diminue."],
      },
    },
  },

  // ---------------------------------------------------------------------------
  {
    id: "abattu",
    label: "Ne mange plus, abattu, fatigué",
    icon: "😿",
    species: ["chien", "chat"],
    start: "graves",
    nodes: {
      graves: {
        q: "Y a-t-il d'autres signes : vomissements, respiration difficile, yeux ou gencives jaunes, ventre douloureux, il se cache et ne bouge plus ?",
        answers: [
          { label: "Oui", next: "abattu_urgent" },
          { label: "Non", next: "duree" },
        ],
      },
      duree: {
        q: "Depuis combien de temps mange-t-il peu ou pas du tout ?",
        answers: [
          { label: "Moins de 24 heures, il boit et reste plutôt actif", next: "abattu_surveiller" },
          { label: "Plus de 24 heures, ou il ne boit plus non plus", next: "abattu_rapide" },
        ],
      },
      abattu_urgent: {
        level: "urgence",
        title: "Abattement avec signes associés : consultez en urgence",
        summary:
          "Un animal qui ne mange plus et présente d'autres signes peut souffrir d'une infection, d'une atteinte du foie, des reins, du pancréas ou d'une intoxication.",
        actions: [
          "Appelez votre vétérinaire aujourd'hui, maintenant.",
          "Prenez sa température si vous le pouvez (voir la fiche « Constantes »).",
        ],
        avoid: [NO_HUMAN_MEDS],
        fiches: ["constantes"],
      },
      abattu_rapide: {
        level: "rapide",
        title: "Perte d'appétit prolongée : consultez dans la journée",
        summary:
          "Chez le chat, ne pas manger plus de 24 à 48 heures peut provoquer une maladie grave du foie (lipidose hépatique), surtout s'il est en surpoids. Chez le chien, plus de 48 heures sans manger justifie un examen.",
        actions: [
          "Prenez rendez-vous aujourd'hui.",
          "Proposez-lui une nourriture appétente légèrement tiédie.",
          "Vérifiez sa bouche (dents, gencives) et sa température.",
        ],
        avoid: [NO_HUMAN_MEDS],
        fiches: ["constantes"],
      },
      abattu_surveiller: {
        level: "surveiller",
        title: "Baisse d'appétit récente : surveillez",
        summary: "Un petit coup de fatigue (chaleur, vaccin récent, stress, changement de nourriture) peut passer en un jour.",
        actions: [
          "Laissez-le se reposer au calme avec de l'eau fraîche à disposition.",
          "Proposez son repas habituel, éventuellement tiédi.",
          "Prenez sa température si vous le pouvez.",
        ],
        watch: [
          "Consultez s'il ne mange toujours pas le lendemain, s'il a de la fièvre (plus de 39,5 °C) ou si d'autres signes apparaissent.",
        ],
        fiches: ["constantes"],
      },
    },
  },

  // ---------------------------------------------------------------------------
  {
    id: "piqure",
    label: "Piqûre, chenille, vipère, crapaud, tique",
    icon: "🐝",
    species: ["chien", "chat", "lapin"],
    start: "cause",
    nodes: {
      cause: {
        q: "Que s'est-il passé ?",
        answers: [
          { label: "Piqûre de guêpe, d'abeille ou de frelon", next: "piqure" },
          { label: "Contact avec des chenilles processionnaires", next: "chenille" },
          { label: "Morsure de serpent (vipère)", next: "vipere" },
          { label: "A léché ou mordu un crapaud", next: "crapaud" },
          { label: "Tique", next: "tique" },
        ],
      },
      piqure: {
        q: "La tête ou la gorge gonflent-elles, respire-t-il difficilement, vomit-il, est-il faible, ou a-t-il été piqué plusieurs fois ou dans la bouche ?",
        answers: [
          { label: "Oui", next: "piqure_urgent" },
          { label: "Non, juste un gonflement local", next: "piqure_simple" },
        ],
      },
      piqure_urgent: {
        level: "urgence",
        title: "Réaction importante à une piqûre : urgence",
        summary:
          "Une piqûre dans la bouche ou la gorge peut gêner la respiration, et une réaction allergique généralisée (choc) peut survenir en quelques minutes.",
        actions: [
          "Partez immédiatement chez le vétérinaire.",
          "Retirez le dard s'il est visible en le grattant avec une carte (sans pincer la poche à venin).",
          "Appliquez du froid (linge humide frais) sur la zone gonflée pendant le trajet.",
        ],
        avoid: ["Ne lui donnez pas d'antihistaminique humain sans avis vétérinaire."],
        fiches: ["transport"],
      },
      piqure_simple: {
        level: "surveiller",
        title: "Piqûre simple : soins locaux",
        summary: "Un gonflement localisé sur une patte ou le corps est fréquent et diminue en quelques heures.",
        actions: [
          "Retirez le dard s'il est visible en le grattant avec une carte.",
          "Appliquez du froid (compresse froide ou glace entourée d'un linge) 10 minutes.",
        ],
        watch: [
          "Surveillez-le pendant 2 à 3 heures : gonflement de la tête, difficulté à respirer, vomissements ou faiblesse = urgence.",
        ],
      },
      chenille: {
        level: "urgence",
        title: "Chenilles processionnaires : urgence",
        summary:
          "Les poils urticants de la chenille provoquent une inflammation très douloureuse et peuvent entraîner la nécrose (perte) d'une partie de la langue. Le chien bave, se frotte la bouche, sa langue gonfle.",
        actions: [
          "Portez des gants.",
          "Rincez abondamment la bouche et la zone touchée à l'eau tiède, en faisant couler l'eau sans frotter, tête de l'animal penchée vers le bas.",
          "Partez chez le vétérinaire immédiatement.",
        ],
        avoid: ["Ne frottez pas : cela casse les poils et libère plus de toxine.", "Ne touchez pas à mains nues."],
        fiches: ["transport"],
      },
      vipere: {
        level: "urgence",
        title: "Morsure de vipère : urgence",
        summary:
          "La zone gonfle fortement et devient douloureuse. Le venin peut provoquer des troubles de la coagulation, du cœur et des reins. Le pronostic est généralement bon s'il est pris en charge vite.",
        actions: [
          "Gardez-le calme et limitez ses mouvements : portez-le si possible.",
          "Retirez son collier si la morsure est sur la tête ou le cou (le gonflement peut l'étouffer).",
          "Partez chez le vétérinaire immédiatement.",
        ],
        avoid: [
          "N'incisez pas, n'aspirez pas, ne posez pas de garrot.",
          "Ne mettez pas de glace.",
          "N'essayez pas d'attraper le serpent.",
        ],
        fiches: ["transport"],
      },
      crapaud: {
        level: "urgence",
        title: "Contact avec un crapaud : rincez puis appelez",
        summary:
          "Le venin du crapaud irrite fortement la bouche (bave abondante, mousse) et peut, plus rarement, toucher le cœur et le système nerveux.",
        actions: [
          "Rincez la bouche à l'eau à faible débit, de l'avant vers l'arrière, tête penchée vers le bas, pendant 5 à 10 minutes.",
          "Essuyez les gencives avec un linge humide.",
          "Appelez votre vétérinaire : en cas de tremblements, troubles de l'équilibre ou de cœur, c'est une urgence vitale.",
        ],
        avoid: ["Ne faites pas couler l'eau vers la gorge : il pourrait l'inhaler."],
      },
      tique: {
        level: "surveiller",
        title: "Tique : retirez-la et surveillez",
        summary:
          "Les tiques transmettent des maladies (piroplasmose, maladie de Lyme…). Les retirer rapidement réduit le risque.",
        actions: [
          "Retirez-la avec un tire-tique : glissez-le sous la tique au ras de la peau, tournez doucement et tirez.",
          "Désinfectez la zone, lavez-vous les mains.",
          "Pensez à un traitement antiparasitaire régulier adapté (demandez à votre vétérinaire).",
        ],
        avoid: [
          "N'utilisez pas d'éther, d'alcool ou d'huile pour « endormir » la tique : elle risque de régurgiter.",
          "Ne l'écrasez pas avec les doigts.",
        ],
        watch: [
          "Chien : dans les jours qui suivent, fièvre, abattement, refus de manger ou urines foncées (couleur café) peuvent signaler une piroplasmose : consultez en urgence.",
        ],
      },
    },
  },

  // ---------------------------------------------------------------------------
  {
    id: "yeux",
    label: "Problème à l'œil",
    icon: "👁️",
    species: ["chien", "chat", "lapin"],
    start: "grave",
    nodes: {
      grave: {
        q: "L'œil est-il sorti de l'orbite, y a-t-il un objet planté, un produit chimique projeté, ou garde-t-il l'œil fermé avec douleur ?",
        answers: [
          { label: "Oui", next: "oeil_urgent" },
          { label: "Non", next: "oeil_rapide" },
        ],
      },
      oeil_urgent: {
        level: "urgence",
        title: "Atteinte grave de l'œil : urgence",
        summary: "Un ulcère, une plaie ou une brûlure de la cornée peut faire perdre l'œil en quelques heures sans traitement.",
        actions: [
          "Produit chimique : rincez immédiatement avec du sérum physiologique ou de l'eau tiède pendant 10 à 15 minutes.",
          "Œil sorti de l'orbite : gardez-le humide avec une compresse imbibée de sérum physiologique.",
          "Empêchez-le de se frotter (collerette, ou tenez ses pattes).",
          "Partez chez le vétérinaire.",
        ],
        avoid: [
          "Ne retirez pas un objet planté dans l'œil.",
          "N'utilisez pas de collyre humain (certains contenant de la cortisone aggravent les ulcères).",
          "N'appuyez pas sur l'œil.",
        ],
        fiches: ["transport"],
      },
      oeil_rapide: {
        level: "rapide",
        title: "Œil rouge ou qui coule : consultez sous 24 à 48 heures",
        summary: "Conjonctivite, poussière, épillet, ulcère débutant, coryza : un examen de l'œil est nécessaire pour adapter le traitement.",
        actions: [
          "Nettoyez délicatement les écoulements avec une compresse imbibée de sérum physiologique (une compresse par œil).",
          "Prenez rendez-vous avec votre vétérinaire.",
        ],
        avoid: ["N'utilisez pas de collyre humain ou d'un ancien traitement sans avis."],
        watch: ["S'il ferme l'œil, si l'œil devient bleuté ou opaque, ou s'il a mal : consultez en urgence."],
      },
    },
  },

  // ---------------------------------------------------------------------------
  {
    id: "brulure",
    label: "Brûlure, électrocution",
    icon: "🔥",
    species: ["chien", "chat", "lapin"],
    start: "type",
    nodes: {
      type: {
        q: "S'agit-il d'une électrocution (câble mordu), d'un produit chimique, ou d'une brûlure étendue, profonde ou sur la face ?",
        answers: [
          { label: "Oui", next: "brulure_urgent" },
          { label: "Non, petite brûlure superficielle", next: "brulure_simple" },
        ],
      },
      brulure_urgent: {
        level: "urgence",
        title: "Brûlure grave ou électrocution : urgence",
        summary:
          "Une électrocution peut provoquer, plusieurs heures après, un œdème des poumons. Les brûlures étendues entraînent déshydratation et infection.",
        actions: [
          "Électrocution : coupez le courant avant de toucher l'animal, ou écartez-le avec un objet non conducteur (bois sec).",
          "Brûlure thermique : refroidissez la zone à l'eau tempérée (15 à 25 °C) pendant 10 à 15 minutes.",
          "Produit chimique : rincez abondamment à l'eau tiède pendant au moins 15 minutes, en portant des gants.",
          "Couvrez avec un linge propre humide et partez chez le vétérinaire.",
        ],
        avoid: [
          "Ne touchez pas un animal encore en contact avec le courant.",
          "N'appliquez ni beurre, ni huile, ni glace, ni pommade.",
        ],
        fiches: ["rcp", "transport"],
      },
      brulure_simple: {
        level: "rapide",
        title: "Petite brûlure : refroidissez et faites examiner",
        summary: "Chez l'animal, le pelage cache souvent l'étendue réelle de la brûlure, qui peut se révéler plusieurs jours plus tard.",
        actions: [
          "Refroidissez à l'eau tempérée pendant 10 à 15 minutes.",
          "Couvrez avec une compresse humide propre.",
          "Faites contrôler par votre vétérinaire dans la journée.",
        ],
        avoid: ["N'appliquez ni beurre, ni huile, ni glace, ni crème humaine.", "Empêchez-le de lécher la zone."],
      },
    },
  },
];

// -----------------------------------------------------------------------------
// Fiches de premiers secours
// -----------------------------------------------------------------------------
const FICHES = [
  {
    id: "rcp",
    title: "Réanimation cardio-pulmonaire",
    icon: "❤️",
    intro: "À faire uniquement si l'animal est inconscient ET ne respire pas. Appelez ou faites appeler un vétérinaire en même temps.",
    steps: [
      "Vérifiez : il ne réagit pas à la voix ni au toucher, son thorax ne se soulève pas pendant 10 secondes.",
      "Couchez-le sur le côté droit, sur une surface ferme.",
      "Chien de grande taille : placez vos mains l'une sur l'autre sur la partie la plus large du thorax. Chien à thorax en tonneau (bouledogue) : couchez-le sur le dos, mains sur le sternum. Chat et petit chien : entourez le thorax d'une main, juste derrière les coudes.",
      "Comprimez fort et vite : 100 à 120 compressions par minute (rythme de la chanson « Stayin' Alive »), en enfonçant d'un tiers à la moitié de la largeur du thorax. Laissez le thorax remonter complètement entre chaque compression.",
      "Toutes les 30 compressions, faites 2 insufflations : fermez sa gueule avec la main, tendez son cou, soufflez dans ses narines jusqu'à voir le thorax se soulever.",
      "Si vous êtes deux : l'un comprime en continu, l'autre fait 1 insufflation toutes les 6 secondes. Changez de rôle toutes les 2 minutes.",
      "Continuez jusqu'à l'arrivée chez le vétérinaire, ou jusqu'à ce qu'il respire à nouveau seul.",
    ],
    warning: "Ne pratiquez jamais de compressions sur un animal qui respire.",
  },
  {
    id: "etouffement",
    title: "Étouffement",
    icon: "🦴",
    intro: "Si l'animal respire encore et reste conscient, partez directement chez le vétérinaire. Les gestes ci-dessous sont pour un animal qui ne peut plus respirer.",
    steps: [
      "Ouvrez la gueule, tirez la langue vers l'avant et regardez. Si vous voyez l'objet et pouvez le saisir sans l'enfoncer, retirez-le.",
      "Petit chien ou chat : tenez-le la tête en bas, dos contre vous, et donnez 5 tapes fermes entre les omoplates avec le plat de la main.",
      "Grand chien : soulevez ses pattes arrière (position « brouette ») et donnez 5 tapes entre les omoplates.",
      "Si l'objet n'est pas sorti : compressions abdominales. Placez votre poing juste sous les dernières côtes et donnez 5 poussées fermes vers le haut et l'avant (chien debout ou couché sur le côté).",
      "Revérifiez la gueule, retirez l'objet s'il est visible, puis recommencez tapes et compressions.",
      "S'il perd connaissance et ne respire plus : commencez la réanimation cardio-pulmonaire.",
      "Même si l'objet est sorti, faites-le examiner (risque de lésion de la gorge ou des côtes).",
    ],
    warning: "Ne mettez pas les doigts à l'aveugle au fond de la gorge.",
  },
  {
    id: "constantes",
    title: "Prendre les constantes",
    icon: "🩺",
    intro: "Connaître les valeurs normales de votre animal, au calme, vous aidera à repérer un problème et à renseigner le vétérinaire.",
    table: [
      ["", "Chien", "Chat", "Lapin"],
      ["Température rectale", "38 – 39,2 °C", "38 – 39,2 °C", "38,5 – 40 °C"],
      ["Respiration au repos", "10 – 30 / min", "20 – 30 / min", "30 – 60 / min"],
      ["Cœur au repos", "60 – 140 / min (plus lent chez les grands)", "140 – 220 / min", "130 – 325 / min"],
      ["Gencives", "Roses, humides", "Roses, humides", "Roses pâles"],
    ],
    steps: [
      "Température : thermomètre numérique enduit de vaseline, introduit doucement de 1 à 2 cm dans le rectum, en le tenant.",
      "Respiration : comptez les mouvements du thorax pendant 30 secondes et multipliez par 2, quand il dort ou se repose.",
      "Pouls : placez deux doigts à l'intérieur de la cuisse, en haut (artère fémorale), ou main sur le thorax derrière le coude gauche.",
      "Temps de recoloration : appuyez sur la gencive jusqu'à la faire blanchir, relâchez : elle doit redevenir rose en moins de 2 secondes.",
      "Déshydratation : pincez la peau entre les omoplates ; elle doit retomber immédiatement.",
    ],
    warning: "Gencives blanches, grises, bleues ou jaunes, ou température au-dessus de 40 °C (chien, chat) ou en dessous de 37,5 °C : appelez un vétérinaire.",
  },
  {
    id: "transport",
    title: "Transporter un animal blessé",
    icon: "🚗",
    intro: "Un animal blessé a peur et mal : il peut mordre ou griffer, même ceux qu'il aime. Protégez-vous pour pouvoir l'aider.",
    steps: [
      "Approchez-vous lentement en lui parlant calmement, de côté plutôt que de face.",
      "Chat ou petit animal : enveloppez-le dans une serviette ou une couverture, tête comprise, et placez-le dans une caisse (une caisse qui s'ouvre par le dessus est idéale).",
      "Petit chien : portez-le en soutenant le thorax et l'arrière-train.",
      "Grand chien ou suspicion de lésion du dos : glissez-le sur une planche, un carton rigide ou une couverture tendue que deux personnes tiennent par les coins.",
      "En voiture : calez-le, qu'une personne reste à côté de lui si possible, et appelez le vétérinaire pour prévenir de votre arrivée.",
    ],
    warning: "Ne le soulevez jamais par la peau du cou, les pattes ou la queue.",
  },
  {
    id: "museliere",
    title: "Muselière improvisée",
    icon: "🎗️",
    intro: "Utile avant de manipuler un chien qui a mal. Ne l'utilisez pas s'il vomit, respire difficilement, a un museau court, ou a une blessure à la face.",
    steps: [
      "Prenez une bande, une laisse, une cravate ou un collant (environ 1 mètre).",
      "Faites une boucle, passez-la autour du museau et serrez sur le dessus.",
      "Croisez les extrémités sous la mâchoire.",
      "Ramenez-les derrière les oreilles et faites un nœud facile à défaire.",
    ],
    warning: "Retirez-la immédiatement s'il vomit ou a du mal à respirer. Ne la laissez jamais sans surveillance.",
  },
  {
    id: "bandage",
    title: "Faire un pansement compressif",
    icon: "🩹",
    intro: "Pour arrêter un saignement ou protéger une plaie en attendant le vétérinaire.",
    steps: [
      "Placez une compresse propre (ou un linge propre plié) sur la plaie.",
      "Appuyez fermement pendant au moins 5 minutes.",
      "Maintenez la compresse avec une bande que vous enroulez en spirale, en recouvrant la moitié du tour précédent.",
      "Sur une patte, commencez par les doigts et remontez : cela évite que la patte gonfle sous le pansement.",
      "Vérifiez que vous pouvez glisser un doigt sous la bande.",
    ],
    warning: "Doigts froids, gonflés ou qui changent de couleur : le bandage est trop serré, desserrez-le.",
  },
  {
    id: "convulsions",
    title: "Pendant une crise convulsive",
    icon: "⚡",
    intro: "La plupart des crises s'arrêtent seules en 1 à 2 minutes. Votre rôle : éviter qu'il se blesse et observer.",
    steps: [
      "Regardez l'heure dès le début de la crise.",
      "Éloignez les meubles et objets, éloignez-le des escaliers et de l'eau, glissez un coussin sous sa tête.",
      "Éteignez la lumière, la télévision, faites le silence.",
      "Filmez la crise si possible : c'est précieux pour le vétérinaire.",
      "Après la crise, laissez-le récupérer au calme ; il peut être désorienté un moment.",
    ],
    warning: "Plus de 5 minutes, ou crises répétées sans réveil entre deux : urgence vitale. Ne mettez jamais la main dans sa gueule.",
  },
  {
    id: "chaleur",
    title: "Refroidir un animal (coup de chaleur)",
    icon: "🌡️",
    intro: "Signes : halètement intense, bave épaisse, langue très rouge, faiblesse, vomissements, titubation, perte de conscience.",
    steps: [
      "Mettez-le à l'ombre, au frais, dans un courant d'air.",
      "Arrosez-le d'eau fraîche (pas glacée), surtout le ventre, les aisselles, l'intérieur des cuisses et les coussinets.",
      "Ventilez pour faire évaporer l'eau, renouvelez l'arrosage.",
      "Proposez de l'eau fraîche s'il est conscient.",
      "Arrêtez de refroidir à 39,5 °C pour éviter l'excès inverse, et allez chez le vétérinaire.",
    ],
    warning: "Ne laissez jamais un animal dans une voiture au soleil, même fenêtres entrouvertes : la température y dépasse 50 °C en quelques minutes.",
  },
  {
    id: "trousse",
    title: "Trousse de premiers secours",
    icon: "🧰",
    intro: "Préparez-la à l'avance et emportez-la en voyage ou en randonnée.",
    steps: [
      "Compresses stériles, bandes de gaze et bande cohésive (qui ne colle pas aux poils).",
      "Sparadrap, ciseaux à bouts ronds, pince à épiler, tire-tique.",
      "Sérum physiologique en dosettes, antiseptique adapté aux animaux (chlorhexidine).",
      "Thermomètre numérique, gants jetables.",
      "Couverture de survie, serviette, muselière adaptée.",
      "Seringue sans aiguille (pour rincer ou donner de l'eau).",
      "Le carnet de santé, la liste de ses traitements et le numéro de votre vétérinaire.",
    ],
    warning: "Ne gardez pas de médicaments humains dans la trousse de votre animal.",
  },
  {
    id: "toxiques",
    title: "Liste des toxiques courants",
    icon: "☠️",
    intro: "Voir l'onglet « Toxiques » pour la liste complète des aliments, plantes et produits dangereux.",
    link: "#/toxiques",
    steps: [],
  },
];

// -----------------------------------------------------------------------------
// Toxiques courants
// -----------------------------------------------------------------------------
const TOXIQUES = [
  {
    category: "Aliments",
    items: [
      { name: "Chocolat, cacao", who: "Chien, chat", effect: "Agitation, vomissements, troubles du cœur, convulsions. Le chocolat noir est le plus dangereux.", severity: "élevée" },
      { name: "Raisin, raisins secs", who: "Chien (chat suspecté)", effect: "Insuffisance rénale, même en petite quantité.", severity: "élevée" },
      { name: "Xylitol (chewing-gum, bonbons, pâtisseries « sans sucre »)", who: "Chien", effect: "Chute brutale du sucre dans le sang, atteinte du foie.", severity: "élevée" },
      { name: "Oignon, ail, poireau, échalote, ciboulette", who: "Chat, chien", effect: "Destruction des globules rouges (anémie), signes retardés de plusieurs jours.", severity: "moyenne" },
      { name: "Avocat", who: "Lapin, rongeurs, oiseaux", effect: "Troubles cardiaques et respiratoires.", severity: "élevée" },
      { name: "Noix de macadamia", who: "Chien", effect: "Faiblesse des pattes arrière, tremblements, fièvre.", severity: "moyenne" },
      { name: "Alcool, pâte à pain crue", who: "Tous", effect: "Ivresse, baisse du sucre et de la température, ventre gonflé (pâte qui lève).", severity: "élevée" },
      { name: "Café, thé, boissons énergisantes", who: "Tous", effect: "Agitation, troubles du cœur, tremblements.", severity: "moyenne" },
      { name: "Os cuits, noyaux, épis de maïs", who: "Chien", effect: "Occlusion ou perforation de l'intestin.", severity: "moyenne" },
    ],
  },
  {
    category: "Plantes",
    items: [
      { name: "Lys, hémérocalle (toutes les parties, pollen, eau du vase)", who: "Chat", effect: "Insuffisance rénale aiguë souvent mortelle.", severity: "élevée" },
      { name: "Laurier-rose", who: "Tous", effect: "Troubles graves du rythme cardiaque.", severity: "élevée" },
      { name: "Muguet, digitale", who: "Tous", effect: "Troubles du cœur.", severity: "élevée" },
      { name: "If", who: "Tous", effect: "Arrêt cardiaque possible, même en petite quantité.", severity: "élevée" },
      { name: "Cycas (palmier sagou)", who: "Chien, chat", effect: "Atteinte grave du foie.", severity: "élevée" },
      { name: "Dieffenbachia, philodendron, pothos", who: "Tous", effect: "Irritation de la bouche, bave, vomissements.", severity: "moyenne" },
      { name: "Poinsettia, ficus", who: "Tous", effect: "Irritation digestive, généralement légère.", severity: "faible" },
      { name: "Bulbes (tulipe, jonquille, narcisse)", who: "Chien, chat", effect: "Vomissements, diarrhée, troubles cardiaques pour de grandes quantités.", severity: "moyenne" },
    ],
  },
  {
    category: "Médicaments et produits",
    items: [
      { name: "Paracétamol", who: "Chat surtout, chien", effect: "Un seul comprimé peut tuer un chat (sang, foie).", severity: "élevée" },
      { name: "Ibuprofène, aspirine, anti-inflammatoires humains", who: "Chien, chat", effect: "Ulcères de l'estomac, insuffisance rénale.", severity: "élevée" },
      { name: "Antigel (éthylène glycol)", who: "Tous", effect: "Insuffisance rénale ; goût sucré qui attire les animaux.", severity: "élevée" },
      { name: "Raticides, souricides", who: "Tous", effect: "Hémorragies retardées de 3 à 5 jours (antidote existant).", severity: "élevée" },
      { name: "Anti-limaces (métaldéhyde)", who: "Chien, chat", effect: "Tremblements, convulsions, forte fièvre.", severity: "élevée" },
      { name: "Antiparasitaires pour chien à la perméthrine", who: "Chat", effect: "Tremblements, convulsions.", severity: "élevée" },
      { name: "Huiles essentielles (arbre à thé, eucalyptus…)", who: "Chat surtout", effect: "Troubles nerveux, atteinte du foie, irritation.", severity: "moyenne" },
      { name: "Cannabis, drogues", who: "Chien surtout", effect: "Démarche ivre, fuites urinaires, somnolence ou agitation.", severity: "moyenne" },
      { name: "Javel, détartrants, déboucheurs", who: "Tous", effect: "Brûlures de la bouche et du tube digestif.", severity: "élevée" },
    ],
  },
];

// -----------------------------------------------------------------------------
// Contacts d'urgence (France). À vérifier régulièrement.
// -----------------------------------------------------------------------------
const CONTACTS = [
  {
    name: "CNITV – Centre antipoison vétérinaire (Lyon)",
    phone: "04 78 87 10 40",
    note: "Avis toxicologique pour les animaux, 24 h/24.",
  },
  {
    name: "CAPAE-Ouest – Centre antipoison animal (Nantes)",
    phone: "02 40 68 77 40",
    note: "Avis toxicologique pour les animaux.",
  },
  {
    name: "Vétérinaire de garde",
    phone: null,
    note: "Appelez votre vétérinaire habituel : son répondeur indique généralement le vétérinaire de garde. Vous pouvez aussi chercher « vétérinaire de garde » suivi de votre ville.",
  },
];

if (typeof module !== "undefined") {
  module.exports = { SPECIES, LEVELS, RED_FLAGS, COMMON_RESULTS, SYMPTOMS, FICHES, TOXIQUES, CONTACTS };
}
