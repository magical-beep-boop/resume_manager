import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { NextResponse } from "next/server";
import { parseResumeText } from "@/lib/resume-import";

function getExtension(filename) {
  return filename.toLowerCase().split(".").pop();
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Upload a PDF or Word resume file." }, { status: 400 });
    }

    const extension = getExtension(file.name || "");
    const buffer = Buffer.from(await file.arrayBuffer());
    let extractedText = "";

    if (extension === "pdf") {
      const parser = new PDFParse({ data: buffer });
      const parsed = await parser.getText();
      extractedText = parsed.text || "";
      await parser.destroy();
    } else if (extension === "docx") {
      const parsed = await mammoth.extractRawText({ buffer });
      extractedText = parsed.value || "";
    } else if (extension === "doc") {
      return NextResponse.json(
        { error: "Legacy .doc files are not supported yet. Please save the file as .docx or upload a PDF." },
        { status: 415 }
      );
    } else {
      return NextResponse.json(
        { error: "Only PDF and Word files are supported." },
        { status: 415 }
      );
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from that file. Try a different PDF or a .docx export." },
        { status: 422 }
      );
    }

    const parsedResume = parseResumeText(extractedText);
    return NextResponse.json(parsedResume);
  } catch (error) {
    return NextResponse.json(
      { error: "Resume import failed. Try a PDF or .docx version of the file." },
      { status: 500 }
    );
  }
}
