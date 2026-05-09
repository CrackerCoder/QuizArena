import type { EducationLevel } from "@/lib/settings";

export type Preset = { subject: string; topic: string; level: EducationLevel };
export type PresetCategory = { label: string; emoji: string; presets: Preset[] };

export const PRESET_CATEGORIES: PresetCategory[] = [
  {
    label: "Primary School",
    emoji: "🏫",
    presets: [
      { subject: "Mathematics", topic: "Fractions & Decimals", level: "primary" },
      { subject: "Mathematics", topic: "Perimeter & Area", level: "primary" },
      { subject: "Science", topic: "States of Matter", level: "primary" },
      { subject: "Bahasa Melayu", topic: "Tatabahasa Asas", level: "primary" },
      { subject: "English", topic: "Grammar Basics", level: "primary" },
    ],
  },
  {
    label: "PT3 (Form 1–3)",
    emoji: "📘",
    presets: [
      { subject: "Mathematics", topic: "Algebraic Expressions", level: "pt3" },
      { subject: "Mathematics", topic: "Linear Equations", level: "pt3" },
      { subject: "Science", topic: "Respiration & Photosynthesis", level: "pt3" },
      { subject: "Sejarah", topic: "Kerajaan Melayu Awal", level: "pt3" },
      { subject: "Geografi", topic: "Bentuk Muka Bumi Malaysia", level: "pt3" },
    ],
  },
  {
    label: "SPM (Form 4–5)",
    emoji: "📗",
    presets: [
      { subject: "Additional Mathematics", topic: "Quadratic Functions", level: "spm" },
      { subject: "Additional Mathematics", topic: "Differentiation", level: "spm" },
      { subject: "Additional Mathematics", topic: "Integration", level: "spm" },
      { subject: "Biology", topic: "Cell Division (Mitosis & Meiosis)", level: "spm" },
      { subject: "Chemistry", topic: "Chemical Bonding", level: "spm" },
      { subject: "Physics", topic: "Forces & Motion", level: "spm" },
      { subject: "Sejarah", topic: "Kesultanan Melayu Melaka", level: "spm" },
      { subject: "Sejarah", topic: "Malaysia Merdeka & Pembentukan Malaysia", level: "spm" },
      { subject: "Bahasa Melayu", topic: "Teks Argumentatif & Perbahasan", level: "spm" },
      { subject: "English Literature", topic: "Short Stories", level: "spm" },
    ],
  },
  {
    label: "STPM (Form 6)",
    emoji: "📕",
    presets: [
      { subject: "Mathematics (T)", topic: "Calculus", level: "stpm" },
      { subject: "Mathematics (T)", topic: "Vectors & Matrices", level: "stpm" },
      { subject: "Biology", topic: "Genetics & Inheritance", level: "stpm" },
      { subject: "Chemistry", topic: "Electrochemistry", level: "stpm" },
      { subject: "Physics", topic: "Quantum Physics", level: "stpm" },
      { subject: "Economics", topic: "Macroeconomics — GDP & Growth", level: "stpm" },
      { subject: "Pengajian Am", topic: "Isu-isu Semasa Malaysia", level: "stpm" },
    ],
  },
  {
    label: "IGCSE / O Level",
    emoji: "🌍",
    presets: [
      { subject: "Mathematics", topic: "Coordinate Geometry", level: "igcse" },
      { subject: "Biology", topic: "Enzymes & Digestion", level: "igcse" },
      { subject: "Chemistry", topic: "Atomic Structure", level: "igcse" },
      { subject: "Physics", topic: "Electricity & Circuits", level: "o-level" },
      { subject: "English", topic: "Directed Writing", level: "igcse" },
    ],
  },
  {
    label: "A Level",
    emoji: "🎓",
    presets: [
      { subject: "Mathematics", topic: "Further Calculus", level: "a-level" },
      { subject: "Biology", topic: "Molecular Biology & DNA Technology", level: "a-level" },
      { subject: "Chemistry", topic: "Organic Chemistry Mechanisms", level: "a-level" },
      { subject: "Physics", topic: "Nuclear Physics", level: "a-level" },
      { subject: "Economics", topic: "Market Structures & Game Theory", level: "a-level" },
    ],
  },
];
