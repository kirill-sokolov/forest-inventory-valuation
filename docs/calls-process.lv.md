# Zvanu kvalitātes analīzes process

## Mērķis un prototipa robeža

Risinājuma mērķis ir pēc katra klienta zvana dot darbiniekam īsu un pārbaudāmu atgriezenisko saiti, bet dienas beigās sagatavot atšķirīgus kopsavilkumus darbiniekam un vadītājam. Sistēma palīdz pamanīt neizrunātus jautājumus, nākamos darbus un mācību vajadzības. Tā nepieņem disciplinārus, atalgojuma vai citus personāla lēmumus.

Prototipa sadaļa `/zvani` sāk darbu ar pabeigta zvana transkriptu, kurā runātāji apzīmēti kā `Darbinieks:` un `Klients:`. Tajā nav telefonijas integrācijas, audio augšupielādes, runas atpazīšanas, lietotāju kontu vai ilgtermiņa glabāšanas. Iebūvētajā demonstrācijā ir pieci pilnībā izdomāti zvanu mēģinājumi un iepriekš saglabāti novērojumi, tāpēc visu dienas pārskatu var pārbaudīt bez API atslēgas un bez personas datiem.

Demonstrācijas kontroles rezultāts ir pieci mēģinājumi, četri izvērtēti zvani, kopējais ilgums 18:20 un vidējais kvalitātes vērtējums 82,5. Var atvērt katru zvanu, pārbaudīt kritērijus un citātus, apskatīt darbinieka un vadītāja kopsavilkumu, kā arī kopēt, sagatavot e-pastu vai lejupielādēt JSON.

## Process pēc katra zvana

1. Sistēma saņem zvana metadatus un transkriptu. Neatbildēts mēģinājums tiek ieskaitīts zvanu apjomā un ilgumā, bet netiek vērtēts pēc kvalitātes kritērijiem.
2. Jaunam transkriptam valodas modelis drīkst piedāvāt tikai strukturētus novērojumus un faktus: kritērija statusu, pārliecības līmeni, īsu pamatojumu un precīzu citātu no transkripta.
3. Programmas kods pārbauda rezultāta shēmu un pierādījumus. Pozitīvs vai daļējs vērtējums bez citāta tiek pazemināts līdz neizpildītam kritērijam un rada brīdinājumu. Kopsavilkuma fakts tiek rādīts tikai tad, ja saistītais kritērijs ir pozitīvs; turpmākās darbības citātam papildus jāsakrīt ar nākamā soļa pierādījumu.
4. Programmas kods, nevis modelis, piemēro versēto rubriku, aprēķina punktus un nosaka kvalitātes grupu. Pārliecība zem 0,70 nemaina punktus, bet nosūta zvanu cilvēka pārbaudei.
5. Darbinieks saņem viena zvana pārskatu ar stiprajām pusēm, izlaistajiem kritērijiem, iegūtajiem faktiem, nākamo soli un visiem gadījumiem, kas jāpārbauda.
6. Dienas beigās sistēma agregē zvanu mēģinājumus divos lomu skatījumos. Kopsummas tiek rēķinātas no pārbaudītajiem strukturētajiem rezultātiem, nevis no brīva modeļa teksta.

## Vērtēšanas rubrika

Prototips izmanto versiju `procurement-v1` ar deviņiem kritērijiem un kopējo svaru 100 punkti:

| Kritērijs | Svars |
|---|---:|
| Sasveicināšanās un iepazīstināšana | 10 |
| Zvana mērķa izskaidrošana | 10 |
| Vajadzības vai objekta noskaidrošana | 15 |
| Galveno parametru iegūšana | 15 |
| Cenas un nosacījumu pārrunāšana | 15 |
| Termiņa un lēmuma procesa noskaidrošana | 10 |
| Jautājumu vai iebildumu apstrāde | 10 |
| Konkrēta nākamā soļa vienošanās | 10 |
| Kopsavilkums un pieklājīga sarunas noslēgšana | 5 |

Statuss “izpildīts” dod pilnu kritērija svaru, “daļēji izpildīts” — pusi, “nav izpildīts” — nulli. “Nav piemērojams” tiek izņemts no saucēja. Gala vērtējums ir noapaļots rezultāts `100 × iegūtie piemērojamie punkti / piemērojamo kritēriju svars`. Vērtējums no 85 ir labs, 70–84 norāda uz pilnveidojamu zvanu, bet rezultāts zem 70 nonāk pārbaudes grupā. Pie katra rezultāta saglabā rubrikas versiju, lai dažādu versiju rādītāji netiktu nepamatoti salīdzināti.

## Pārskats par vienu zvanu

Pēc zvana ir redzama šāda informācija:

- zvana identifikators, sākuma laiks, ilgums, darbinieks, kontakta neitrāls apzīmējums un iznākums;
- kopējais vērtējums un kvalitātes grupa vai norāde, ka neatbildēts zvans netiek vērtēts;
- katra kritērija statuss, svars, pārliecība, pamatojums un citāts no transkripta;
- labi izpildītie kritēriji un konkrēti izlaidumi, nevis vispārīgs modeļa iespaids;
- sarunā noskaidrotā vajadzība, būtiskie parametri un nākamais solis ar atbildīgo un termiņu, ja tas ir pateikts;
- brīdinājumi un skaidrs cilvēka pārbaudes statuss.

Šāds formāts ļauj darbiniekam un vadītājam pārbaudīt katru secinājumu pret avotu. Prototips neveido saiti uz audio fragmentu, jo audio netiek saņemts vai glabāts.

## Dienas kopsavilkumi

**Darbinieka skatā** ir tikai viņa zvani: kopējais, savienoto, neatbildēto un izvērtēto mēģinājumu skaits, kopējais un vidējais ilgums, vidējais vērtējums, kvalitātes grupu sadalījums, stiprākie un pilnveidojamie kritēriji, sarunātie turpmākie darbi un pārbaudāmie zvani. Mērķis ir palīdzēt sagatavoties nākamajām sarunām, nevis veidot darbinieku reitingu.

**Vadītāja skatā** ir komandas apjoms un ilgums, vidējais vērtējums, kvalitātes grupu sadalījums, kritēriju izpildes īpatsvari, biežākie izlaidumi, turpmāko darbu saraksts un prioritāra cilvēka pārbaudes rinda. Darbinieku rindas dod kontekstu darba organizēšanai un individuālai pārrunai, bet sistēma neveido “labāko” vai “sliktāko” darbinieku sarakstu.

## Mākslīgā intelekta un datu robeža

Valodas modelis jaunam transkriptam ir informācijas izvilkšanas palīgs. Tas drīkst piedāvāt fiksētās shēmas novērojumus un tikai tādus secinājumus, kuriem var pievienot citātu no ievades. Modelis neaprēķina punktus un kopsummas, nemaina rubrikas svarus, nenosaka personāla sekas un nevērtē akcentu, personību, emocijas vai citus ar darba procesu nesaistītus signālus.

Determinētais dzinējs pārbauda pierādījumu, piemēro `procurement-v1`, apstrādā statusu “nav piemērojams”, aprēķina viena zvana rezultātu un visas dienas metrikas. Iebūvētais paraugs izmanto repozitorijā saglabātus novērojumus; tā rezultāts ir atkārtojams un neizsauc maksas modeli. Ielīmējot jaunu transkriptu, pārlūks serverim sūta tikai tekstu, nevis audio. API pieņem ne vairāk kā 100 KB un bez konfigurētas atslēgas atgriež saprotamu kļūdu.

## Privātums un cilvēka pārbaude

Prototipā ir tikai sintētiski vārdi, kontaktu apzīmējumi un transkripti. Tajā nav reālu ierakstu, tālruņa numuru vai pasūtītāja darbinieku datu.

Pirms produkcijas izmantošanas procesa īpašniekam kopā ar juridisko un datu aizsardzības atbildīgo jāapstiprina zvana ierakstīšanas un darbinieku analīzes tiesiskais pamats, klientu un darbinieku informēšana, datu minimizēšana, piekļuves lomas un atšķirīgi audio, transkripta un strukturētā pārskata glabāšanas termiņi. Dati jāpārraida un jāglabā šifrēti; piegādātāju līgumos jānosaka apstrādes reģions, apakšapstrādātāji un aizliegums izmantot saturu modeļu apmācībai. Tehniskajos žurnālos nav jāglabā sarunu saturs.

Cilvēks obligāti pārbauda zvanu, ja rezultāts ir zem 70, kāda novērojuma pārliecība ir zem 0,70, pozitīvam secinājumam trūkst pierādījuma, analīze ir tehniski nepilnīga vai darbinieks rezultātu apstrīd. Darbiniekam jāredz pamatojums un jābūt iespējai pieprasīt labojumu. Labojumi jāauditē un jāizmanto rubrikas kalibrēšanai, nevis modeļa secinājums jāuzskata par galīgu patiesību.

## Produkcijas plūsma

Produkcijā paredzētā plūsma ir šāda:

1. Telefonijas sistēma pēc pabeigta zvana nosūta drošu notikumu ar zvana identifikatoru, laiku, ilgumu un ieraksta atsauci. Atkārtots notikums nedrīkst radīt dublikātu.
2. Pirms apstrādes pārbauda ierakstīšanas pazīmi, piekļuves tiesības un datu glabāšanas politiku. Nederīgs gadījums nonāk tehniskās pārbaudes rindā.
3. Apstiprināts runas atpazīšanas pakalpojums sagatavo transkriptu ar runātāju nodalījumu un laika atzīmēm. Zemas pārliecības fragmenti tiek atzīmēti.
4. Analīzes serviss no transkripta izveido fiksētās shēmas novērojumus un faktus. Dzinējs validē citātus, aprēķina rezultātu un izveido pārbaudes uzdevumus.
5. Strukturētais pārskats tiek glabāts ar rubrikas versiju un audita ierakstu. Piekļuve tiek piešķirta pēc lomas; darbinieks redz savus, bet vadītājs — savas komandas rezultātus.
6. Pēc katra zvana tiek nosūtīta saite uz pārskatu. Dienas beigās plānotais uzdevums sagatavo darbinieka un vadītāja kopsavilkumus un reģistrē piegādes statusu.

## Ieviešanas plāns

1. **Sagatavošana, viena nedēļa.** Procesa īpašnieks apstiprina rubriku, kritiskos izlaidumus un piemērojamības noteikumus. Juridiskais un datu aizsardzības atbildīgais apstiprina informēšanu, lomas un glabāšanas termiņus. Divi cilvēki neatkarīgi novērtē 30–50 anonimizētu zvanu etalona kopu un vienojas par strīdīgajiem gadījumiem.
2. **Tehniskais pilots, viena līdz divas nedēļas.** Savieno vienu telefonijas avotu, transkripciju, strukturēto analīzi, viena zvana skatu un dienas kopsavilkumus. Ievieš kļūdu statusus, dublikātu aizsardzību, auditu un manuālās pārbaudes rindu.
3. **Ēnas režīms, divas nedēļas.** Rezultātus vēl neizmanto darba novērtējumā. Tos salīdzina ar cilvēku etalonu, labo rubrikas piemērus un nosaka pārliecības slieksni. Atsevišķi pārbauda dažādas valodas, sarunu garumus un darbiniekus.
4. **Kontrolēts pilots, četras nedēļas.** Neliela informēta grupa izmanto pārskatus atgriezeniskajai saitei. Cilvēks pārbauda visus kritiskos un zemas pārliecības gadījumus, kā arī nejaušu 10% pārējo zvanu izlasi. Reizi nedēļā procesa īpašnieks dokumentē kļūdas un rubrikas izmaiņas.
5. **Ieviešanas lēmums.** Plašāka izmantošana sākas tikai pēc kvalitātes, laika ietaupījuma, drošības un privātuma vārtu izpildes. Ja vārti nav sasniegti, labo rubriku vai procesu un atkārto ēnas režīmu; automatizāciju nepadara obligātu tikai tāpēc, ka pilots ir pabeigts.

## Mērīšanas un KPI plāns

Pirms pilota divas nedēļas mēra bāzes līmeni: zvanu skaitu un ilgumu, vadītāja un darbinieka patērēto laiku ierakstu klausīšanai un kopsavilkumiem, katra rubrikas kritērija izpildi, turpmāko darbu reģistrēšanu un tehnisko kļūdu skaitu. Pilotā izmanto vienu rubrikas versiju un stratificētu pārbaudes izlasi pēc darbinieka, sarunas ilguma un valodas. Pirmajai kalibrēšanai etalons ir divu cilvēku saskaņots vērtējums.

| Joma | Mērījums un mērķis | Lēmuma izmantošana |
|---|---|---|
| Piegāde | Vismaz 95% derīgu zvanu pārskats pieejams piecu minūšu laikā; vismaz 99% dienas kopsavilkumu sagatavoti noteiktajā laikā | Zem mērķa nepaplašina pilotu un novērš integrācijas šauro vietu |
| Pilnīgums | Tehnisku kļūdu dēļ neapstrādāti ne vairāk kā 2% derīgu zvanu | Pārbauda telefonijas, transkripcijas un analīzes kļūdas atsevišķi |
| Pierādījumu kvalitāte | Vismaz 90% sistēmas citātu cilvēks atzīst par secinājumam atbilstošiem | Zem mērķa modelis nevar automātiski pabeigt pārskatu |
| Kritēriju precizitāte | Vismaz 85% statusu sakrīt ar divu cilvēku saskaņoto etalonu | Atšķirības analizē pa kritērijam, valodai un zvana tipam |
| Kritiskie izlaidumi | Neatklāti ne vairāk kā 5% etalonā atzīmēto kritisko izlaidumu | Slieksni nekompensē ar augstu vidējo punktu skaitu |
| Laika ietaupījums | Manuālai klausīšanai un kopsavilkumiem patērētais laiks samazinās vismaz par 60%, saglabājot kvalitātes mērķus | Aprēķina faktiskās stundas un izmaksas pret bāzes periodu |
| Procesa rezultāts | Pēc četru nedēļu pilota kritisko izlaidumu īpatsvars samazinās vismaz par 20% pret bāzi | Interpretē kopā ar zvanu sastāva un apjoma izmaiņām |
| Uzticēšanās | Seko apstrīdēto un cilvēka laboto rezultātu īpatsvaram un īsai lietotāju aptaujai | Pieaugošs labojumu īpatsvars aptur automātiskās piegādes paplašināšanu |
| Privātums | Nav neatļautas piekļuves vai satura nonākšanas tehniskajos žurnālos; 100% dzēšanas pieprasījumu izpildīti politikā noteiktajā laikā | Jebkurš būtisks incidents aptur pilotu un izraisa pārbaudi |

Vidējā darbinieka vērtējuma pieaugumu neizmanto kā vienīgo veiksmes rādītāju, jo to var mākslīgi uzlabot zvanu sastāvs vai uzvedība “punktu dēļ”. Lēmumu pieņem pēc četriem vārtiem kopā: tehniski pilnīga piegāde, pietiekama sakritība ar cilvēka etalonu, pierādīts laika ietaupījums un apstiprinātas privātuma prasības.
