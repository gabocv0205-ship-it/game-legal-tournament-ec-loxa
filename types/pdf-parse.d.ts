declare module "pdf-parse" {
  export default function pdfParse(input: Buffer): Promise<{ text: string }>;
}
