# E-pasta melnraksts pasūtītājam

Labdien!

Esmu sagatavojis trīs strādājošus prototipus:

- demonstrācija: https://sokolov.lv/forest/
- publiskais, anonimizētais kods: https://github.com/kirill-sokolov/forest-inventory-valuation

Sadaļā “Meža inventarizācija” var nospiest “Izmantot paraugu” un uzreiz redzēt visu ceļu no nogabalu tabulas līdz gala atskaitei. Var arī augšupielādēt savu inventarizācijas PDF. Aprēķini notiek pārlūkā; fails netiek sūtīts uz serveri. Tabulas redakciju, sortimentu īpatsvarus un cenas, ciršanas, pievešanas un transporta likmes, peļņas procentu un aizsardzības zonas nogabala iekļaušanu var mainīt, un rezultāts pārrēķinās uzreiz.

Sadaļā “Līgumi” ir trīs izdomāti pirkuma un nomas līgumu paraugi. Rezultātā redzama lauka vērtība, uzticamība, avota citāts un pārbaudes statuss, kā arī sagatavots e-pasta kopsavilkums. Savu PDF var apstrādāt izvietotajā versijā; pārlūks uz serveri nosūta tikai izvilkto tekstu, nevis pašu failu.

Sadaļā “Zvanu kvalitāte” var ielādēt izdomātu piecu zvanu dienu un pārbaudīt katra kritērija statusu, svaru un avota citātu. Atsevišķi sagatavots darbinieka un vadītāja dienas kopsavilkums ar zvanu skaitu, ilgumu, kvalitāti, turpmākajiem darbiem un pārbaudes rindu. Jauna transkripta gadījumā tā teksts tiek nosūtīts konfigurētajam OpenRouter modelim, tāpēc prototipā jāizmanto anonimizēts teksts. Modelis tikai strukturē novērojumus; punktus un dienas rādītājus aprēķina programma. Zemi vai nepietiekami pamatoti rezultāti tiek nodoti cilvēka pārbaudei.

Publiskajā repozitorijā un demonstrācijā nav Jūsu dokumentu, reālo īpašumu datu vai kadastra numuru. Privātais inventarizācijas fails tika izmantots tikai lokālai rezultāta pārbaudei.

Trīs pieņēmumi, kurus vēlos skaidri norādīt:

1. Uzdevumā dotā caurmēru tabula atbilst redakcijai līdz 2022. gada 29. jūnijam. Prototips piedāvā gan šo, gan spēkā esošo redakciju un atskaitē norāda izvēlēto.
2. Oz/Os sortimentu kolonnā dotie īpatsvari kopā veido 70%, bet Kamīnmalka rindai ir cena bez īpatsvara. Prototips to saglabā un parāda brīdinājumu par nesadalītajiem 30%. Vai šie 30% bija paredzēti Kamīnmalkai?
3. Zvanu `procurement-v1` rubrika ir caurskatāms prototipa pieņēmums. Pirms pilota jāapstiprina kritēriji, juridiskais pamats, piekļuves un glabāšanas kārtība, kā arī jāsalīdzina rezultāti ar divu cilvēku vērtētu etalonu.

Ātrākais ceļš pārbaudei: sadaļā “Mežs” nospiest “Izmantot paraugu”; sadaļā “Līgumi” lejupielādēt testa PDF, augšupielādēt to un nospiest “Izvilkt datus”; sadaļā “Zvani” nospiest “Ievietot parauga tekstu” un “Analizēt transkriptu”. Zvanu sadaļā pieejami arī lejupielādējami TXT faili. Gatavu līguma piemēru uzreiz var apskatīt ar “Skatīt gatavo rezultātu”, bet piecu zvanu diena jau ir atvērta. Lapā “Lēmumi par risinājumu” ir aprakstīta pieeja, pieņēmumi un salīdzinājums ar Jūsu piemēru.

Ar cieņu

Kirils Sokolovs
