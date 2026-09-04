import { mkdir } from "node:fs/promises";
import path from "node:path";
import { Document, Font, Page, renderToFile, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Stand } from "../engine/inventory/types";
import fixture from "../samples/expected/inventory-paraugmezs.json";

const root = process.cwd();

Font.register({
  family: "Liberation Sans",
  fonts: [
    {
      src: path.join(root, "node_modules/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf"),
    },
    {
      src: path.join(root, "node_modules/pdfjs-dist/standard_fonts/LiberationSans-Bold.ttf"),
      fontWeight: 700,
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    paddingTop: 26,
    paddingHorizontal: 26,
    paddingBottom: 34,
    color: "#111827",
    fontFamily: "Liberation Sans",
    fontSize: 6.6,
  },
  title: { marginBottom: 12, textAlign: "center", fontSize: 16, fontWeight: 700 },
  meta: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  table: { borderTopWidth: 0.7, borderLeftWidth: 0.7, borderColor: "#6b7280" },
  row: { flexDirection: "row" },
  header: { backgroundColor: "#eef2f0", fontWeight: 700 },
  cell: {
    minHeight: 21,
    justifyContent: "center",
    borderRightWidth: 0.7,
    borderBottomWidth: 0.7,
    borderColor: "#6b7280",
    paddingHorizontal: 2,
    paddingVertical: 2,
    textAlign: "center",
  },
  quarter: {
    borderRightWidth: 0.7,
    borderBottomWidth: 0.7,
    borderColor: "#6b7280",
    padding: 4,
    fontWeight: 700,
    textAlign: "center",
    backgroundColor: "#f7f7f4",
  },
  note: {
    borderRightWidth: 0.7,
    borderBottomWidth: 0.7,
    borderColor: "#6b7280",
    paddingVertical: 2,
    paddingHorizontal: 5,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderRightWidth: 0.7,
    borderBottomWidth: 0.7,
    borderColor: "#6b7280",
    padding: 4,
    fontWeight: 700,
  },
  pageFooter: {
    position: "absolute",
    bottom: 16,
    left: 26,
    right: 26,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

const columns: Array<{ label: string; width: string; value: (stand: Stand) => string }> = [
  { label: "Kvartāls/\nnogabals", width: "6%", value: (stand) => String(stand.number) },
  { label: "Ģeo platība, ha", width: "7%", value: (stand) => decimal(stand.areaHa) },
  { label: "Meža zemes veids", width: "12%", value: (stand) => stand.landKind },
  { label: "Meža tips", width: "6%", value: (stand) => stand.forestType ?? "" },
  { label: "Nogabala apraksts", width: "16%", value: (stand) => formulaForPdf(stand) },
  { label: "Izcel-\nšanās", width: "6%", value: (stand) => stand.origin ?? "" },
  { label: "boni-\ntāte", width: "6%", value: (stand) => stand.bonitate ?? "" },
  { label: "vid. augstums", width: "6%", value: (stand) => numeric(stand.heightM) },
  { label: "vid. caurmērs", width: "7%", value: (stand) => numeric(stand.diameterCm) },
  { label: "vecums", width: "6%", value: (stand) => numeric(stand.ageYears) },
  { label: "biezība", width: "5%", value: (stand) => numeric(stand.density) },
  { label: "Šķērslauk. m2/ha", width: "7%", value: (stand) => numeric(stand.basalAreaM2Ha) },
  { label: "koku sk. gab/ha", width: "5%", value: (stand) => numeric(stand.treesPerHa) },
  { label: "krāja m3/ha", width: "5%", value: (stand) => numeric(stand.stockM3Ha) },
];

function decimal(value: number): string {
  return value.toLocaleString("lv-LV", { maximumFractionDigits: 2 });
}

function numeric(value: number | null): string {
  return value === null ? "" : String(value);
}

function formulaForPdf(stand: Stand): string {
  if (stand.number === fixture.generatorNotes.wrapFormulaOfStand) {
    return fixture.generatorNotes.wrapAs.join("\n");
  }
  return stand.formulaRaw ?? "";
}

function noteLines(stand: Stand): string[] {
  const lines: string[] = [];
  if (stand.notes.lastFelling) {
    lines.push(`Pēdējais cirtes izpildes veids un gads: ${stand.notes.lastFelling}`);
  }
  if (stand.notes.lastActivity) {
    lines.push(`Pēdējais darbības veids un gads: ${stand.notes.lastActivity}`);
  }
  if (stand.notes.restored) {
    lines.push(`Atjaunots: ${stand.notes.restored}`);
  }
  if (stand.notes.protection) {
    lines.push(`Aizs.paz.- ${stand.notes.protection.code} ${stand.notes.protection.text}`);
  }
  const area = stand.notes.areaBreakdown;
  if (area) {
    lines.push(
      `Platību sadalījums: t.sk. mežs ${decimal(area.forestHa)} ha, t.sk. ceļi ${decimal(area.roadsHa)} ha, t.sk. grāvji ${decimal(area.ditchesHa)} ha`,
    );
  }
  return lines;
}

function InventoryDocument() {
  const data = fixture as unknown as {
    property: typeof fixture.property;
    totals: typeof fixture.totals;
    quarters: Array<{ number: number; stands: Stand[] }>;
  };
  const reportDate = data.property.reportDate.split(".").reverse().join("-");

  return (
    <Document
      title="Nogabalu raksturojošie rādītāji — Paraugmežs"
      author="forest-inventory-valuation"
      subject="Fictional public test fixture"
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Nogabalu raksturojošie rādītāji</Text>
        <View style={styles.meta}>
          <Text>Zemes vienības apzīmējums- {data.property.landUnit}</Text>
          <Text>inv. veikta {data.property.inventoryYear}. gadā</Text>
        </View>
        <View style={styles.meta}>
          <Text>
            Īpašums - {data.property.propertyCadastre} - {data.property.propertyName}
          </Text>
          <Text>Saimniecība: {data.property.farm}</Text>
        </View>
        <Text style={{ marginBottom: 6 }}>{data.property.parish} pagasts</Text>

        <View style={styles.table}>
          <View style={[styles.row, styles.header]}>
            {columns.map((column) => (
              <Text key={column.label} style={[styles.cell, { width: column.width }]}>
                {column.label}
              </Text>
            ))}
          </View>
          {data.quarters.map((quarter) => (
            <View key={quarter.number}>
              <Text style={styles.quarter}>{quarter.number}. kvartāls</Text>
              {quarter.stands.map((stand) => (
                <View key={stand.number} wrap={false}>
                  <View style={styles.row}>
                    {columns.map((column) => (
                      <Text key={column.label} style={[styles.cell, { width: column.width }]}>
                        {column.value(stand)}
                      </Text>
                    ))}
                  </View>
                  {noteLines(stand).map((line) => (
                    <Text key={line} style={styles.note}>
                      {line}
                    </Text>
                  ))}
                </View>
              ))}
              <View style={styles.footer}>
                <Text>Kopā platība kvartālā (ha): {decimal(data.totals.totalHa)}</Text>
                <Text>
                  Platību sadalījums: t.sk. mežs {decimal(data.totals.forestHa)} ha, t.sk. ceļi 0
                  ha, t.sk. grāvji 0 ha
                </Text>
              </View>
            </View>
          ))}
          <View style={styles.footer}>
            <Text>Kopā platība kadastrā (ha): {decimal(data.totals.totalHa)}</Text>
            <Text>t.sk. mežs {decimal(data.totals.forestHa)} ha</Text>
          </View>
          <View style={styles.footer}>
            <Text>Pavisam kopā (ha): {decimal(data.totals.totalHa)}</Text>
            <Text>t.sk. mežs {decimal(data.totals.forestHa)} ha</Text>
          </View>
        </View>
        <View style={styles.pageFooter} fixed>
          <Text>{data.property.landUnit}</Text>
          <Text>{reportDate}</Text>
          <Text render={({ pageNumber, totalPages }) => `lpp ${pageNumber} no ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

async function main(): Promise<void> {
  const sampleDirectory = path.join(root, "samples");
  const publicDirectory = path.join(root, "public", "samples");
  await mkdir(sampleDirectory, { recursive: true });
  await mkdir(publicDirectory, { recursive: true });

  const samplePath = path.join(sampleDirectory, "inventory-paraugmezs.pdf");
  const publicPath = path.join(publicDirectory, "inventory-paraugmezs.pdf");
  await renderToFile(<InventoryDocument />, samplePath);
  await renderToFile(<InventoryDocument />, publicPath);
  process.stdout.write(`${samplePath}\n${publicPath}\n`);
}

await main();
