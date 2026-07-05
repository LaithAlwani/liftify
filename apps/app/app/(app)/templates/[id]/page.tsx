"use client";

import { useParams } from "next/navigation";
import { TemplateEditor } from "@/components/templates/template-editor";

export default function EditTemplatePage() {
  const params = useParams();
  const id = params.id as string;
  return <TemplateEditor templateId={id} />;
}
