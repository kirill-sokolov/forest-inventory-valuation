# Lēmumi par prototipu

Šis prototips parāda, kā no meža inventarizācijas un līgumu PDF, kā arī zvana transkripta iegūt pārbaudāmu darba rezultātu vienas dienas laikā. Zemāk ir svarīgākie lēmumi, to iemesli un praktiskais ieguvums pasūtītājam.

## Pieeja un problēmas sadalījums

Uzdevumu sadalīju trīs atšķirīgās plūsmās: skaitliski pārbaudāmā meža inventarizācija, semantiski interpretējamie līgumi un pierādījumos balstīta zvanu kvalitātes kontrole. Inventarizācijas plūsma ir PDF teksts → normalizācija → strukturēti dati → tiesību noteikumi → aprēķins → atskaite; līgumu plūsma ir teksts → strukturēta izvilkšana → shēmas pārbaude → kopsavilkums; zvanu plūsma ir transkripts → kritēriju novērojumi ar citātiem → determinēts vērtējums → dienas pārskati. Rīkus izvēlējos pēc kļūdas riska: determinētu kodu visiem skaitļiem, valodas modeli tikai brīvas formas tekstam un pārbaudāmus paraugus katra posma validācijai. Vienas dienas ierobežojumā vispirms izveidoju pilnu darbojošos plūsmu, bet apzināti neiekļāvu infrastruktūru, kas prototipa galveno pieņēmumu nepārbauda.

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
