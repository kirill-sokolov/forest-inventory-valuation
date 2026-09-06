# Lēmumi par prototipu

Šis prototips parāda, kā no meža inventarizācijas un līgumu PDF, kā arī zvana transkripta iegūt pārbaudāmu darba rezultātu vienas dienas laikā. Zemāk ir svarīgākie lēmumi, to iemesli un praktiskais ieguvums pasūtītājam.

## Pieeja un problēmas sadalījums

Uzdevumu sadalīju trīs atšķirīgās plūsmās: skaitliski pārbaudāmā meža inventarizācija, semantiski interpretējamie līgumi un pierādījumos balstīta zvanu kvalitātes kontrole. Inventarizācijas plūsma ir PDF teksts → normalizācija → strukturēti dati → tiesību noteikumi → aprēķins → atskaite; līgumu plūsma ir teksts → strukturēta izvilkšana → shēmas pārbaude → kopsavilkums; zvanu plūsma ir transkripts → kritēriju novērojumi ar citātiem → determinēts vērtējums → dienas pārskati. Rīkus izvēlējos pēc kļūdas riska: determinētu kodu visiem skaitļiem, valodas modeli tikai brīvas formas tekstam un pārbaudāmus paraugus katra posma validācijai. Vienas dienas ierobežojumā vispirms izveidoju pilnu darbojošos plūsmu, bet apzināti neiekļāvu infrastruktūru, kas prototipa galveno pieņēmumu nepārbauda.

## Pārbaude pret uzdevuma piemēru

Galvenā pārbaude ir uzdevuma pielikumā dotais inventarizācijas PDF ar speciālista aprēķinu. Šis fails ir tikai lokāli un nav publicēts, bet prototips uz tā dod tādu pašu rezultātu kā speciālists:

- kailcirtei atlasīti tie paši nogabali: 1., 3., 4., 7., 8. un 12.;
- cērtamais apjoms 1039 m³ ar tādu pašu sadalījumu pa sugām (E 34, B 499, A 102, Ba 391, Bl 13 m³);
- ieņēmumi 56 322 EUR, izmaksas 24 935 EUR, peļņa 3 139 EUR;
- maksimālā iegādes summa 28 249 EUR jeb 27,19 EUR/m³, tieši kā piemērā.

Kā to pārbaudīt piecās minūtēs:

- sadaļā “Mežs” nospiediet “Izmantot paraugu” un salīdziniet gala atskaites četras rindas ar skaitļiem zemāk, vai augšupielādējiet savu inventarizācijas PDF;
- sadaļā “Līgumi” izvēlieties paraugu “nepilns pirkuma līgums” un skatiet, kuri lauki atzīmēti “Jāpārbauda” un kāpēc;
- sadaļā “Zvani” ielādējiet parauga dienu, atveriet zvanu ar 60 punktiem un pārbaudiet katra kritērija citātu.

Publiskais paraugs “Paraugmežs” ir izdomāts, bet tā rezultāts (689 m³, 23 435 EUR, 34,01 EUR/m³) ir izrēķināts ar roku pirms koda rakstīšanas un tīši satur sarežģītus gadījumus: nogabalu, kas maina statusu starp tabulas redakcijām, formulu ar koeficientu summu 9, ozola nogabalu, kas padara nesadalīto Oz/Os kolonnu dārgu, aizsargjoslas nogabalu, formulu divās rindās un nemeža rindu.

Papildus ir 101 automātiskie testi, kas pārbauda PDF nolasīšanu, sastāva formulas, likuma tabulas, aprēķinu, atskaiti, līgumu validāciju ar citātu pārbaudi un zvanu vērtēšanu, un tie darbojas bez API atslēgas. To pašu atskaiti var iegūt no komandrindas, tāpēc rezultāts nav atkarīgs no lietotnes. Spēkā esošā MK noteikumu Nr. 935 caurmēru tabula ir salīdzināta ar likumi.lv 2026. gada septembrī un sakrīt.

## Rīki un kāpēc tieši tie

Pirms rakstīt savu kodu, pārbaudīju, vai uzdevumu jau neatrisina gatavs produkts: mežsaimniecības sistēmas, Latvijas cirsmu kalkulatori, dokumentu apstrādes platformas un atvērtais kods. Neviens no tiem nelasa Valsts meža dienesta PDF un nenoved to līdz cirsmas vērtībai pēc MK noteikumu Nr. 935 loģikas; Latvijas kalkulatori vērtē pēc iepriekšējiem darījumiem, pasaules sistēmas gaida lauka mērījumus. Tāpēc gatavus komponentus izmantoju tur, kur tie ir, bet aprēķinu ķēde ir sava.

Izvēlētie rīki un iemesli:

- PDF nolasīšana ar pdf.js tieši pārlūkā. Fails nepamet lietotāja datoru, teksts nāk ar koordinātām, tāpēc tabulu var atjaunot pa kolonnām. Tas pats dzinējs darbojas komandrindā un testos.
- Aprēķinu dzinējs TypeScript valodā kā tīras funkcijas ar automātiskajiem testiem. Katrs solis ir atsevišķi pārbaudāms pret uzdevuma piemēru, un rezultāts vienmēr atkārtojas.
- Likuma tabulas kā dati ar redakcijas datumu. Kad tabula mainās, maina vienu failu, un atskaite pati nosauc izmantoto redakciju.
- Valodas modelis caur OpenRouter ar strukturētu izvadi tikai brīva teksta uzdevumiem: līgumiem un zvanu transkriptiem. Noklusētais modelis ir Gemini 2.5 Flash Lite ar diviem rezerves modeļiem, izvēlēti pēc strukturētās izvades atbalsta un cenas. Modeļa atbilde iziet trīs pārbaudes: fiksētā shēma noraida nepilnu vai nestrukturētu atbildi; kods pārbauda obligātos laukus, datumus un identifikatoru formātus; katra lauka citāts tiek meklēts dokumenta tekstā, un lauks bez citāta, ar neatrastu citātu vai neeksistējošu lappusi nonāk sarakstā “Jāpārbauda”. Tas nepierāda, ka vērtība ir pareiza, bet garantē, ka izdomāta vērtība nepaliks nepamanīta.
- Bezservera funkcijas Vercel vidē tikai modeļa izsaukumam. Pārlūks sūta izvilkto tekstu, nevis PDF, un bez atslēgas demonstrācija darbojas no saglabātiem rezultātiem.
- Lietotne Vite un React, latviešu valodā, eksports TXT, JSON un DOCX. Bez datubāzes un kontiem, jo tos vienā dienā nevar pārbaudīt.

Apsvērtās alternatīvas un kāpēc šim uzdevumam izvēlējos citādi:

- OCR un attēlu modeļi (Mistral OCR, Docling un līdzīgi) der skenētiem dokumentiem un ir pieejami arī kā API. Reģistra PDF ir teksta slānis, tāpēc tiešā nolasīšana ir precīzāka skaitļos, bez maksas un bez trešās puses. OCR paliek kā rezerves ceļš skenētiem failiem ar pārbaudi pret platību kopsummām.
- Dokumentu platformas (Docsumo, Rossum, LlamaExtract un līdzīgas) labi izvelk laukus, bet neveic MK 935 aprēķinu un prasa abonementu vai maksu par lapu. No tām pārņēmu principu: katram laukam vērtība, uzticamība un citāts no avota.
- Zema koda platformas (n8n, Make) der plūsmu savienošanai, un n8n var versionēt arī caur Git. Šeit galvenais risks ir aprēķina kļūda, un to visvieglāk noķert ar automātiskajiem testiem pie koda, tāpēc aprēķins ir kodā. Zema koda rīki ir laba izvēle nākamajam solim: piegādei uz e-pastu, CRM vai telefoniju.
- Valsts meža dienesta reģistra API PDF vietā. Publisks datu slānis pastāv, bet pieprasījums “nogabali pēc kadastra numura” bez atsevišķas vienošanās nav pieejams, un uzdevumā sāpe ir tieši PDF. API ir otrā iterācija.
- Excel kā aprēķinu dzinējs. Matrica ar īpatsvariem un cenām ir saglabāta redigējama lietotnē, bet formulas ir kodā ar testiem, lai kļūdainu šūnu nevarētu netīšām pārrakstīt.

## 1. Vispirms strādājošs prototips

Risinājumam nav lietotāju kontu, datubāzes un sarežģītas infrastruktūras. Vienas dienas darbā svarīgākais ir pierādīt, ka process no faila līdz rezultātam darbojas. Tas ļauj risinājumu pārbaudīt uz reāliem failiem un tikai pēc tam lemt par ieviešanu.

## 2. Inventarizācijas PDF vispirms lasa noteikumu vadīts parsētājs

Valsts reģistra PDF parasti satur atlasāmu tekstu, tāpēc tabulu vispirms nolasa determinēts parsētājs. Tas ir ātrs, bez maksas un atkārtojams. Mākslīgā intelekta rezerves ceļš būtu vajadzīgs tikai PDF bez derīgas tabulas; tā rezultāts vienmēr būtu jāpārbauda pret dokumenta platību kopsummām.

## 3. Visi meža aprēķinu skaitļi rodas pārlūkā

Kailcirtes atlasi, apjomu, sugu sadalījumu, sortimentus, izmaksas un maksimālo pirkuma cenu aprēķina programmas noteikumi, nevis valodas modelis. Likmes un matricas daļas var mainīt, un rezultāts pārrēķinās uzreiz. Tas dod skaidru aprēķina gaitu un iespēju atkārtot rezultātu.

## 4. Likuma tabulām ir norādīta redakcija

Uzdevumā dotā caurmēru tabula atbilst redakcijai līdz 2022. gada 29. jūnijam, bet spēkā esošie sliekšņi dažās vietās atšķiras. Risinājumā ir abas redakcijas, noklusēti tiek lietota spēkā esošā, un atskaite nosauc izmantoto redakciju. Ja rezultāts mainās, brīdinājums nosauc attiecīgo nogabalu.

Avoti: MK noteikumu Nr. 935 7. pielikums — https://likumi.lv/ta/id/253760-noteikumi-par-koku-cirsanu-meza un Meža likuma 9. pants — https://likumi.lv/ta/id/2825-meza-likums.

## 5. Neskaidrības tiek parādītas, nevis noklusētas

Aizsardzības pazīme, nepilna sortimentu kolonna vai nepareiza sastāva koeficientu summa neaptur atskaiti. Risinājums parāda brīdinājumu, norāda labojamo ievadi un aizsardzības zonas gadījumā arī alternatīvo rezultātu bez šī nogabala. Speciālists saglabā lēmumu, bet problēma nepaliek nepamanīta.

## 6. Abiem līgumu veidiem ir viena pārbaudāma shēma

Pirkuma un nomas līgumiem izmanto vienu datu struktūru. Katram laukam ir vērtība, uzticamības novērtējums un citāts no avota. Pēc izvilkšanas programma atsevišķi pārbauda obligātos laukus, datumus un identifikatoru formātus. Tas ļauj vienādi sagatavot tabulu un e-pasta kopsavilkumu, vienlaikus skaidri parādot, kas cilvēkam jāpārbauda.

## 7. Demonstrācija darbojas arī bez API atslēgas

Publiskajiem sintētiskajiem līgumiem ir saglabāti demonstrācijas rezultāti. Ja serverī nav OpenRouter atslēgas, tos var apskatīt no kešatmiņas. Savu līgumu apstrādei atslēga ir vajadzīga; pats PDF uz serveri netiek sūtīts, tikai pārlūkā izvilktais teksts.

## 8. Publiskajā versijā nav pasūtītāja datu

Repozitorijā un vietnē ir tikai izdomāta meža inventarizācija un pašu radīti līgumu un zvanu paraugi. Pasūtītāja faili paliek lokāli un tiek izmantoti tikai privātā pārbaudē. Tas ļauj publiski parādīt risinājuma kvalitāti, neizpaužot dokumentus, sarunas vai īpašumu datus.

## 9. Zvana vērtējums ir izsekojams līdz transkripta citātam

Valodas modelis var tikai piedāvāt fiksētas rubrikas novērojumus un avota citātus. Programma pārbauda citāta esamību transkriptā un pati aprēķina punktus. Nepamatots pozitīvs secinājums tiek pazemināts, nevis klusi pieņemts. Tas ļauj darbiniekam un vadītājam saprast un apstrīdēt katru rezultātu.

## 10. Dienas pārskats palīdz pilnveidoties, nevis veido darbinieku reitingu

Darbinieks redz tikai savus zvanus, turpmākos darbus, stiprās puses un pilnveidojamos kritērijus. Vadītājs redz komandas apjomu, ilgumu, biežākos izlaidumus un pārbaudāmos zvanus, bet ne automātisku cilvēku rangu. Zems vērtējums vai zema pārliecība vienmēr nozīmē cilvēka pārbaudi, nevis personāla lēmumu.

## 11. Telefonijas integrācija sākas tikai pēc rubrikas un privātuma pilota

Prototips izmanto tikai izdomātus transkriptus un neglabā audio. Pirms produkcijas nepieciešama juridiski pamatota zvanu ierakstīšana, lomu piekļuve, glabāšanas termiņi, labojumu ceļš un salīdzinājums ar divu cilvēku saskaņotu etalonu. Integrāciju paplašina tikai tad, ja sasniegta pietiekama precizitāte, laika ietaupījums un privātuma prasības.

## Pieņēmumi un atklātie jautājumi

Uzdevums neapraksta visu, un daļu lēmumu pieņēmu pats. Katrs pieņēmums ir apzināts, ir redzams atskaitē vai brīdinājumos un ir maināms vienā vietā.

- Caurmēru tabula. Uzdevumā dotā tabula atbilst redakcijai līdz 29.06.2022; priedei un bērzam III bonitātē tur ir 27 un 22 cm, bet spēkā esošajā redakcijā 30 un 25 cm. Noklusēti lietoju spēkā esošo, jo pēc vecās tabulas nogabals var izskatīties cērtams, bet apliecinājumu tam neizsniegs. Abas redakcijas ir pārslēdzamas.
- Baltalksnis vienmēr cērtams. Tas ņemts no uzdevuma teksta; likuma tekstā šādu izņēmumu neatradu, tāpēc tas ir uzņēmuma noteikums, ne likuma norma.
- Aizsardzības pazīme neizslēdz nogabalu. Piemērā 1. nogabals ar aizsargjoslu ir iekļauts, tāpēc arī prototips to iekļauj, bet brīdina un rāda alternatīvu bez tā. Piemērā tā ir trešdaļa apjoma: 331 no 1039 m³.
- Oz/Os sortimentu kolonna. Uzdevuma matricā tās īpatsvari kopā dod 70 %, bet rindai “Kamīnmalka” ir cena bez īpatsvara. Prototips matricu saglabā, nesadalītos 30 % vērtē ar 0 EUR un brīdina.
- Pievešanas apstākļi un attālums. Uzdevums tos min, bet formulu nedod. Speciālista vērtējums ievadāms kā pievešanas un transporta likme EUR/m³ (piemērā 7 un 6); attāluma tabulas prototipā nav.
- Noapaļošana. Rēķinu ar pilnu precizitāti un noapaļoju tikai atskaitē. Tāpēc blīgznas 12,72 m³ atskaitē ir 13 m³, kaut piemērā rakstīts 12; kopējais apjoms un summa sakrīt ar piemēru.
- Sastāva formula. Koeficientu summai jābūt 10; ja tā nav, rēķinu ar dotajiem koeficientiem un brīdinu. Reti sugu kodi (kļava, liepa, goba, vīksna) ņemti no nozares mācību materiāliem; nezināms kods nonāk kolonnā “Citi” ar brīdinājumu.
- Līgumu identifikatori. Reģistrācijas numurs, personas kods un kadastra numurs tiek pārbaudīti tikai pēc formāta, jo kontrolsummas algoritmi nav publiski; IBAN pārbauda pēc starptautiskā standarta. Citāta esamība dokumentā tiek pārbaudīta, bet vērtības pareizību pret citātu apstiprina cilvēks.
- Zvanu rubrika. Deviņi kritēriji ar svariem, kas kopā dod 100 punktus, ir prototipa pieņēmums, jo uzdevumā kritēriji nav doti. Transkripts tiek gaidīts ar runātāju atzīmēm; telefonija un runas atpazīšana ir aprakstītas, ne iebūvētas.

Jautājumi, uz kuriem gribētu atbildi pirms nākamā soļa:

- Kuru caurmēru tabulas redakciju uzņēmums lieto darbā?
- Vai Oz/Os kolonnas trūkstošie 30 % bija paredzēti kamīnmalkai?
- Vai aizsargjoslas nogabals tiešām jāiekļauj pilnā apjomā, vai tikai daļēji?
- Vai pievešanas attālumam ir sava likmju tabula, ko vajadzētu iebūvēt?
- Kādi ir uzņēmuma zvanu kvalitātes kritēriji un kāda telefonijas sistēma tiek lietota?

