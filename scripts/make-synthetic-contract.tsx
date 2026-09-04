import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Document, Font, Page, renderToFile, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { ContractAnalysis } from "../engine/contracts/extract";
import type { ContractExtraction, Field, MoneyValue, RentValue } from "../engine/contracts/schema";
import { renderContractSummary } from "../engine/contracts/summary";
import { validateContract } from "../engine/contracts/validate";

const regularFont = path.resolve(
  "node_modules/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf",
);
const boldFont = path.resolve("node_modules/pdfjs-dist/standard_fonts/LiberationSans-Bold.ttf");

Font.register({
  family: "Liberation Sans",
  fonts: [
    { src: regularFont, fontWeight: 400 },
    { src: boldFont, fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    fontFamily: "Liberation Sans",
    fontSize: 9.5,
    lineHeight: 1.45,
    color: "#17251f",
    paddingTop: 46,
    paddingBottom: 48,
    paddingHorizontal: 50,
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: "#276749",
    paddingBottom: 12,
    marginBottom: 20,
  },
  eyebrow: {
    color: "#276749",
    fontSize: 8,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    lineHeight: 1.2,
    marginBottom: 5,
  },
  meta: { color: "#52645b", fontSize: 8.5 },
  notice: {
    backgroundColor: "#fff8df",
    borderLeftWidth: 3,
    borderLeftColor: "#b7791f",
    padding: 9,
    marginBottom: 16,
    fontSize: 8.5,
  },
  section: { marginBottom: 15 },
  heading: {
    fontSize: 11,
    fontWeight: 700,
    color: "#1d4f3a",
    marginBottom: 6,
  },
  paragraph: { marginBottom: 6, textAlign: "justify" },
  row: { flexDirection: "row", gap: 12, marginBottom: 6 },
  column: { flexGrow: 1, flexBasis: 0 },
  label: { fontWeight: 700 },
  box: {
    borderWidth: 1,
    borderColor: "#b8c7c0",
    backgroundColor: "#f5f8f6",
    padding: 10,
    marginBottom: 10,
  },
  signatureRow: { flexDirection: "row", gap: 28, marginTop: 28 },
  signature: { flexGrow: 1, flexBasis: 0, borderTopWidth: 1, paddingTop: 5 },
  footerLeft: {
    position: "absolute",
    bottom: 22,
    left: 50,
    fontSize: 7.5,
    color: "#6b7b73",
  },
  footerPage: {
    position: "absolute",
    bottom: 22,
    right: 50,
    width: 80,
    textAlign: "right",
    fontSize: 7.5,
    color: "#6b7b73",
  },
});

function field<T>(value: T, quote: string, page = 1, confidence = 0.98): Field<T> {
  return { value, confidence, source: { page, quote } };
}

function empty<T>(): Field<T> {
  return { value: null, confidence: 0, source: null };
}

const purchase: ContractExtraction = {
  document: {
    type: field("purchase", "NEKUSTAMĀ ĪPAŠUMA PIRKUMA LĪGUMS"),
    title: field("Nekustamā īpašuma pirkuma līgums", "NEKUSTAMĀ ĪPAŠUMA PIRKUMA LĪGUMS"),
    signedAt: field("2026-08-12", "Rīgā, 2026. gada 12. augustā"),
    place: field("Rīga", "Rīgā, 2026. gada 12. augustā"),
  },
  parties: [
    {
      role: field("seller", "Pārdevējs"),
      name: field("SIA Zaļais Nams", "SIA Zaļais Nams"),
      registrationNumber: field("40000000011", "reģistrācijas Nr. 40000000011"),
      personalCode: empty<string>(),
      address: field("Parauga bulvāris 8, Rīga, LV-1001", "Parauga bulvāris 8, Rīga, LV-1001"),
      representative: field("Marta Liepa", "valdes locekles Martas Liepas personā"),
      iban: field("LV80BANK0000435195001", "LV80BANK0000435195001", 1, 0.99),
    },
    {
      role: field("buyer", "Pircējs"),
      name: field("Elīna Ozola", "Elīna Ozola"),
      registrationNumber: empty<string>(),
      personalCode: field("320180-00001", "personas kods 320180-00001"),
      address: field("Izdomu iela 12-4, Rīga, LV-1002", "Izdomu iela 12-4, Rīga, LV-1002"),
      representative: empty<string>(),
      iban: empty<string>(),
    },
  ],
  object: {
    address: field("Parauga ceļš 11, Izdomu pagasts", "Parauga ceļš 11, Izdomu pagasts"),
    cadastreNumber: field("00000000011", "kadastra numurs 00000000011"),
    area: field({ value: 6.42, unit: "ha" }, "kopējā platība 6,42 ha"),
    description: field(
      "Zemes īpašums ar mežaudzi un palīgēku",
      "zemes īpašums ar mežaudzi un palīgēku",
    ),
  },
  financials: {
    price: field<MoneyValue>(
      { amount: 48_500, currency: "EUR", netAmount: 40_082.64, grossAmount: 48_500 },
      "Pirkuma cena ir 48 500,00 EUR",
    ),
    rent: empty<RentValue>(),
    vat: field({ included: true, rate: 21 }, "cenā ir ietverts PVN 21 %"),
    deposit: field<MoneyValue>(
      { amount: 4_850, currency: "EUR" },
      "drošības maksājumu 4 850,00 EUR",
    ),
    paymentDeadline: field("2026-08-30", "ne vēlāk kā līdz 2026. gada 30. augustam"),
    penalty: field(
      "0,1 % no kavētās summas par katru kavējuma dienu",
      "līgumsodu 0,1 % no kavētās summas par katru kavējuma dienu",
      2,
    ),
  },
  term: {
    effectiveFrom: field("2026-08-12", "Līgums stājas spēkā tā parakstīšanas dienā", 2),
    effectiveTo: empty<string>(),
    durationMonths: empty<number>(),
    noticePeriodDays: empty<number>(),
    autoRenewal: empty<boolean>(),
  },
  specialConditions: [
    {
      title: "Zemesgrāmata",
      quote: "Pircējs 10 darba dienu laikā iesniedz nostiprinājuma lūgumu zemesgrāmatā.",
      page: 2,
    },
    {
      title: "Apgrūtinājumi",
      quote: "Pārdevējs apliecina, ka nav citu nereģistrētu apgrūtinājumu.",
      page: 2,
    },
  ],
};

const lease: ContractExtraction = {
  document: {
    type: field("lease", "NEKUSTAMĀ ĪPAŠUMA NOMAS LĪGUMS"),
    title: field("Nekustamā īpašuma nomas līgums", "NEKUSTAMĀ ĪPAŠUMA NOMAS LĪGUMS"),
    signedAt: field("2026-09-15", "Jelgavā, 2026. gada 15. septembrī"),
    place: field("Jelgava", "Jelgavā, 2026. gada 15. septembrī"),
  },
  parties: [
    {
      role: field("lessor", "Iznomātājs"),
      name: field("SIA Miera Telpas", "SIA Miera Telpas"),
      registrationNumber: field("40000000022", "reģistrācijas Nr. 40000000022"),
      personalCode: empty<string>(),
      address: field("Mācību iela 3, Jelgava, LV-3001", "Mācību iela 3, Jelgava, LV-3001"),
      representative: field("Rihards Bērziņš", "valdes locekļa Riharda Bērziņa personā"),
      iban: field("LV97HABA0012345678910", "LV97HABA0012345678910"),
    },
    {
      role: field("lessee", "Nomnieks"),
      name: field("SIA Darba Parks", "SIA Darba Parks"),
      registrationNumber: field("40000000023", "reģistrācijas Nr. 40000000023"),
      personalCode: empty<string>(),
      address: field(
        "Fikcijas laukums 5, Jelgava, LV-3002",
        "Fikcijas laukums 5, Jelgava, LV-3002",
      ),
      representative: field("Līga Priede", "valdes locekles Līgas Priedes personā"),
      iban: empty<string>(),
    },
  ],
  object: {
    address: field("Miera iela 22, Jelgava", "Miera ielā 22, Jelgavā"),
    cadastreNumber: field("00000000022", "kadastra numurs 00000000022"),
    area: field({ value: 120, unit: "m²" }, "120 m² platībā"),
    description: field("Biroja telpas ēkas otrajā stāvā", "biroja telpas ēkas otrajā stāvā"),
  },
  financials: {
    price: empty<MoneyValue>(),
    rent: field<RentValue>(
      {
        amount: 650,
        currency: "EUR",
        period: "mēnesī",
        netAmount: 650,
        grossAmount: 786.5,
      },
      "Nomas maksa ir 650,00 EUR mēnesī bez PVN",
    ),
    vat: field({ included: false, rate: 21 }, "papildus maksājams PVN 21 %"),
    deposit: field<MoneyValue>({ amount: 1_300, currency: "EUR" }, "drošības naudu 1 300,00 EUR"),
    paymentDeadline: field("katra mēneša 10. datums", "līdz katra mēneša 10. datumam"),
    penalty: field(
      "0,05 % no kavētā maksājuma par katru dienu",
      "līgumsods 0,05 % no kavētā maksājuma par katru dienu",
      2,
    ),
  },
  term: {
    effectiveFrom: field("2026-10-01", "no 2026. gada 1. oktobra"),
    effectiveTo: field("2029-09-30", "līdz 2029. gada 30. septembrim"),
    durationMonths: field(36, "uz 36 mēnešiem"),
    noticePeriodDays: field(60, "rakstveidā paziņojot vismaz 60 dienas iepriekš", 2),
    autoRenewal: field(false, "automātiski nepagarinās", 2),
  },
  specialConditions: [
    {
      title: "Pirmstermiņa izbeigšana",
      quote: "Katra puse var izbeigt līgumu, rakstveidā paziņojot vismaz 60 dienas iepriekš.",
      page: 2,
    },
    {
      title: "Telpu nodošana",
      quote: "Telpas nodod ar abpusēji parakstītu pieņemšanas un nodošanas aktu.",
      page: 2,
    },
  ],
};

const incompletePurchase: ContractExtraction = {
  document: {
    type: field("purchase", "NEPILNĪGS PIRKUMA LĪGUMA PARAUGS"),
    title: field("Nepilnīgs pirkuma līguma paraugs", "NEPILNĪGS PIRKUMA LĪGUMA PARAUGS"),
    signedAt: field("2026-09-20", "Rīgā, 2026. gada 20. septembrī"),
    place: field("Rīga", "Rīgā, 2026. gada 20. septembrī"),
  },
  parties: [
    {
      role: field("seller", "Pārdevējs"),
      name: field("SIA Parauga Īpašumi", "SIA Parauga Īpašumi"),
      registrationNumber: field("40000000033", "reģistrācijas Nr. 40000000033"),
      personalCode: empty<string>(),
      address: field("Nosacījumu iela 1, Rīga", "Nosacījumu iela 1, Rīga"),
      representative: empty<string>(),
      iban: empty<string>(),
    },
    {
      role: field("buyer", "Pircējs"),
      name: field("SIA Drošs Pircējs", "SIA Drošs Pircējs"),
      registrationNumber: field("40000000034", "reģistrācijas Nr. 40000000034"),
      personalCode: empty<string>(),
      address: field("Pārbaudes iela 2, Rīga", "Pārbaudes iela 2, Rīga"),
      representative: empty<string>(),
      iban: empty<string>(),
    },
  ],
  object: {
    address: field("Nepabeigtā iela 33, Rīga", "Nepabeigtā iela 33, Rīga"),
    cadastreNumber: field("0000-ABC-33", "kadastra apzīmējums 0000-ABC-33", 1, 0.58),
    area: field({ value: 0.18, unit: "ha" }, "platība 0,18 ha"),
    description: field("Zemesgabals ar nepabeigtu būvi", "zemesgabals ar nepabeigtu būvi"),
  },
  financials: {
    price: empty<MoneyValue>(),
    rent: empty<RentValue>(),
    vat: empty<{ included: boolean; rate: number }>(),
    deposit: empty<MoneyValue>(),
    paymentDeadline: empty<string>(),
    penalty: empty<string>(),
  },
  term: {
    effectiveFrom: empty<string>(),
    effectiveTo: empty<string>(),
    durationMonths: empty<number>(),
    noticePeriodDays: empty<number>(),
    autoRenewal: empty<boolean>(),
  },
  specialConditions: [
    {
      title: "Nezināms apgrūtinājums",
      quote: "Pircējs ir informēts par iespējamu apgrūtinājumu, kura saturs nav pievienots.",
      page: 1,
    },
  ],
};

interface SyntheticSample {
  name: string;
  extraction: ContractExtraction;
  document: React.ReactElement<React.ComponentProps<typeof Document>>;
}

function Header({ title, meta }: { title: string; meta: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.eyebrow}>Sintētisks mācību dokuments</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.meta}>{meta}</Text>
    </View>
  );
}

function Footer({ page, total }: { page: number; total: number }) {
  return (
    <>
      <Text style={styles.footerLeft} fixed>
        Fiktīvi dati - nav juridisks dokuments
      </Text>
      <Text style={styles.footerPage} fixed>
        {page} / {total}
      </Text>
    </>
  );
}

function PurchaseDocument() {
  return (
    <Document
      title="Sintētisks nekustamā īpašuma pirkuma līgums"
      author="forest-inventory-valuation"
      creator="forest-inventory-valuation"
      producer="@react-pdf/renderer"
      language="lv"
      creationDate={new Date("2026-09-04T00:00:00.000Z")}
      modificationDate={new Date("2026-09-04T00:00:00.000Z")}
    >
      <Page size="A4" style={styles.page}>
        <Header title="NEKUSTAMĀ ĪPAŠUMA PIRKUMA LĪGUMS" meta="Rīgā, 2026. gada 12. augustā" />
        <View style={styles.section}>
          <Text style={styles.heading}>1. Līdzēji</Text>
          <View style={styles.row}>
            <View style={styles.column}>
              <Text style={styles.label}>Pārdevējs</Text>
              <Text>
                SIA Zaļais Nams, reģistrācijas Nr. 40000000011, juridiskā adrese Parauga bulvāris 8,
                Rīga, LV-1001, valdes locekles Martas Liepas personā.
              </Text>
              <Text>Norēķinu konts: LV80BANK0000435195001.</Text>
            </View>
            <View style={styles.column}>
              <Text style={styles.label}>Pircējs</Text>
              <Text>
                Elīna Ozola, personas kods 320180-00001, deklarētā adrese Izdomu iela 12-4, Rīga,
                LV-1002.
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.heading}>2. Līguma priekšmets</Text>
          <Text style={styles.paragraph}>
            2.1. Pārdevējs pārdod un Pircējs pērk nekustamo īpašumu Parauga ceļš 11, Izdomu pagasts,
            kadastra numurs 00000000011, kopējā platība 6,42 ha.
          </Text>
          <Text style={styles.paragraph}>
            2.2. Īpašums ir zemes īpašums ar mežaudzi un palīgēku. Tā sastāvs un robežas Pircējam ir
            zināmas.
          </Text>
        </View>
        <View style={styles.box}>
          <Text style={styles.label}>Pirkuma cena</Text>
          <Text>
            Pirkuma cena ir 48 500,00 EUR. Cenā ir ietverts PVN 21 %: neto summa 40 082,64 EUR,
            bruto summa 48 500,00 EUR.
          </Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.heading}>3. Norēķinu kārtība</Text>
          <Text style={styles.paragraph}>
            3.1. Pircējs samaksā drošības maksājumu 4 850,00 EUR piecu darba dienu laikā.
          </Text>
          <Text style={styles.paragraph}>
            3.2. Atlikušo pirkuma cenu Pircējs pārskaita ne vēlāk kā līdz 2026. gada 30. augustam.
          </Text>
        </View>
        <Footer page={1} total={2} />
      </Page>
      <Page size="A4" style={styles.page}>
        <Header title="PUŠU TIESĪBAS UN NOSLĒGUMA NOTEIKUMI" meta="Pirkuma līguma turpinājums" />
        <View style={styles.section}>
          <Text style={styles.heading}>4. Apliecinājumi un apgrūtinājumi</Text>
          <Text style={styles.paragraph}>
            4.1. Pārdevējs apliecina, ka nav citu nereģistrētu apgrūtinājumu un par īpašumu nav
            tiesvedības.
          </Text>
          <Text style={styles.paragraph}>
            4.2. Pircējs ir apskatījis īpašumu un pieņem tā faktisko stāvokli.
          </Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.heading}>5. Atbildība</Text>
          <Text style={styles.paragraph}>
            5.1. Maksājuma kavējuma gadījumā Pircējs maksā līgumsodu 0,1 % no kavētās summas par
            katru kavējuma dienu.
          </Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.heading}>6. Īpašuma tiesību nostiprināšana</Text>
          <Text style={styles.paragraph}>
            6.1. Pircējs 10 darba dienu laikā iesniedz nostiprinājuma lūgumu zemesgrāmatā.
          </Text>
          <Text style={styles.paragraph}>6.2. Līgums stājas spēkā tā parakstīšanas dienā.</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.heading}>7. Noslēguma noteikumi</Text>
          <Text style={styles.paragraph}>
            7.1. Līgums sagatavots divos eksemplāros latviešu valodā, pa vienam katrai pusei.
          </Text>
        </View>
        <View style={styles.signatureRow}>
          <View style={styles.signature}>
            <Text>Pārdevējs: Marta Liepa</Text>
          </View>
          <View style={styles.signature}>
            <Text>Pircējs: Elīna Ozola</Text>
          </View>
        </View>
        <Footer page={2} total={2} />
      </Page>
    </Document>
  );
}

function LeaseDocument() {
  return (
    <Document
      title="Sintētisks nekustamā īpašuma nomas līgums"
      author="forest-inventory-valuation"
      creator="forest-inventory-valuation"
      producer="@react-pdf/renderer"
      language="lv"
      creationDate={new Date("2026-09-04T00:00:00.000Z")}
      modificationDate={new Date("2026-09-04T00:00:00.000Z")}
    >
      <Page size="A4" style={styles.page}>
        <Header title="NEKUSTAMĀ ĪPAŠUMA NOMAS LĪGUMS" meta="Jelgavā, 2026. gada 15. septembrī" />
        <View style={styles.section}>
          <Text style={styles.heading}>1. Līdzēji</Text>
          <Text style={styles.paragraph}>
            Iznomātājs: SIA Miera Telpas, reģistrācijas Nr. 40000000022, juridiskā adrese Mācību
            iela 3, Jelgava, LV-3001, valdes locekļa Riharda Bērziņa personā. Konts
            LV97HABA0012345678910.
          </Text>
          <Text style={styles.paragraph}>
            Nomnieks: SIA Darba Parks, reģistrācijas Nr. 40000000023, juridiskā adrese Fikcijas
            laukums 5, Jelgava, LV-3002, valdes locekles Līgas Priedes personā.
          </Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.heading}>2. Nomas objekts</Text>
          <Text style={styles.paragraph}>
            Iznomātājs nodod Nomniekam biroja telpas ēkas otrajā stāvā Miera ielā 22, Jelgavā,
            kadastra numurs 00000000022, 120 m² platībā.
          </Text>
        </View>
        <View style={styles.box}>
          <Text style={styles.label}>Nomas maksa</Text>
          <Text>
            Nomas maksa ir 650,00 EUR mēnesī bez PVN. Papildus maksājams PVN 21 %, kopā 786,50 EUR
            mēnesī.
          </Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.heading}>3. Maksājumi</Text>
          <Text style={styles.paragraph}>
            3.1. Nomas maksa maksājama līdz katra mēneša 10. datumam.
          </Text>
          <Text style={styles.paragraph}>3.2. Nomnieks iemaksā drošības naudu 1 300,00 EUR.</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.heading}>4. Līguma termiņš</Text>
          <Text style={styles.paragraph}>
            Līgums noslēgts uz 36 mēnešiem - no 2026. gada 1. oktobra līdz 2029. gada 30.
            septembrim.
          </Text>
        </View>
        <Footer page={1} total={2} />
      </Page>
      <Page size="A4" style={styles.page}>
        <Header title="NOMAS NOTEIKUMI" meta="Nomas līguma turpinājums" />
        <View style={styles.section}>
          <Text style={styles.heading}>5. Telpu lietošana un nodošana</Text>
          <Text style={styles.paragraph}>
            5.1. Telpas nodod ar abpusēji parakstītu pieņemšanas un nodošanas aktu.
          </Text>
          <Text style={styles.paragraph}>
            5.2. Nomnieks telpas izmanto tikai biroja vajadzībām un ievēro ēkas iekšējās kārtības
            noteikumus.
          </Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.heading}>6. Atbildība un izbeigšana</Text>
          <Text style={styles.paragraph}>
            6.1. Par maksājuma kavējumu Nomnieks maksā līgumsodu 0,05 % no kavētā maksājuma par
            katru dienu.
          </Text>
          <Text style={styles.paragraph}>
            6.2. Katra puse var izbeigt līgumu, rakstveidā paziņojot vismaz 60 dienas iepriekš.
          </Text>
          <Text style={styles.paragraph}>
            6.3. Līgums pēc termiņa beigām automātiski nepagarinās.
          </Text>
        </View>
        <View style={styles.signatureRow}>
          <View style={styles.signature}>
            <Text>Iznomātājs: Rihards Bērziņš</Text>
          </View>
          <View style={styles.signature}>
            <Text>Nomnieks: Līga Priede</Text>
          </View>
        </View>
        <Footer page={2} total={2} />
      </Page>
    </Document>
  );
}

function IncompleteDocument() {
  return (
    <Document
      title="Sintētisks nepilnīgs pirkuma līguma paraugs"
      author="forest-inventory-valuation"
      creator="forest-inventory-valuation"
      producer="@react-pdf/renderer"
      language="lv"
      creationDate={new Date("2026-09-04T00:00:00.000Z")}
      modificationDate={new Date("2026-09-04T00:00:00.000Z")}
    >
      <Page size="A4" style={styles.page}>
        <Header title="NEPILNĪGS PIRKUMA LĪGUMA PARAUGS" meta="Rīgā, 2026. gada 20. septembrī" />
        <View style={styles.notice}>
          <Text>
            Šajā sintētiskajā paraugā apzināti nav pirkuma cenas un kadastra numurs ir nepareizā
            formātā. Tas paredzēts validācijas demonstrācijai.
          </Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.heading}>1. Līdzēji</Text>
          <Text style={styles.paragraph}>
            Pārdevējs: SIA Parauga Īpašumi, reģistrācijas Nr. 40000000033, adrese Nosacījumu iela 1,
            Rīga.
          </Text>
          <Text style={styles.paragraph}>
            Pircējs: SIA Drošs Pircējs, reģistrācijas Nr. 40000000034, adrese Pārbaudes iela 2,
            Rīga.
          </Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.heading}>2. Līguma priekšmets</Text>
          <Text style={styles.paragraph}>
            Pārdevējs pārdod zemesgabalu ar nepabeigtu būvi adresē Nepabeigtā iela 33, Rīga,
            kadastra apzīmējums 0000-ABC-33, platība 0,18 ha.
          </Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.heading}>3. Pirkuma cena</Text>
          <Text style={styles.paragraph}>Pirkuma cena: ____________________ EUR.</Text>
          <Text style={styles.paragraph}>Maksājuma termiņš: ____________________.</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.heading}>4. Īpašie nosacījumi</Text>
          <Text style={styles.paragraph}>
            Pircējs ir informēts par iespējamu apgrūtinājumu, kura saturs nav pievienots.
          </Text>
        </View>
        <View style={styles.signatureRow}>
          <View style={styles.signature}>
            <Text>Pārdevējs</Text>
          </View>
          <View style={styles.signature}>
            <Text>Pircējs</Text>
          </View>
        </View>
        <Footer page={1} total={1} />
      </Page>
    </Document>
  );
}

function cachedAnalysis(data: ContractExtraction): ContractAnalysis {
  const validation = validateContract(data);
  return {
    data,
    issues: validation.issues,
    needsReview: validation.needsReview,
    summary: renderContractSummary(data, validation),
    model: null,
  };
}

const samples: SyntheticSample[] = [
  {
    name: "synthetic-pirkuma-ligums",
    extraction: purchase,
    document: <PurchaseDocument />,
  },
  {
    name: "synthetic-nomas-ligums",
    extraction: lease,
    document: <LeaseDocument />,
  },
  {
    name: "synthetic-pirkuma-nepilns",
    extraction: incompletePurchase,
    document: <IncompleteDocument />,
  },
];

const contractsDirectory = path.resolve("samples/contracts");
const expectedDirectory = path.resolve("samples/expected");
await mkdir(contractsDirectory, { recursive: true });
await mkdir(expectedDirectory, { recursive: true });

for (const sample of samples) {
  await renderToFile(sample.document, path.join(contractsDirectory, `${sample.name}.pdf`));
  await writeFile(
    path.join(expectedDirectory, `contract-${sample.name}.json`),
    `${JSON.stringify(sample.extraction, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(expectedDirectory, `contract-${sample.name}.extracted.json`),
    `${JSON.stringify(cachedAnalysis(sample.extraction), null, 2)}\n`,
    "utf8",
  );
}

console.log(`Generated ${samples.length} synthetic contract PDFs and cached results.`);
