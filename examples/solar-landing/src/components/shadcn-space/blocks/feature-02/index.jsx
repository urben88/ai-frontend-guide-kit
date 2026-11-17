"use client";
import Feature from "@/components/shadcn-space/blocks/feature-02/feature";
import {
    Box,
    CirclePlay,
    CodeXml,
} from "lucide-react"

const featureData = [
    { icon: Box, title: "Menos factura de luz", content: "Produces energía para tu consumo y compras menos a la red." },
    { icon: CirclePlay, title: "Presupuesto claro", content: "Sabes el precio y lo que incluye antes de firmar nada." },
    { icon: CodeXml, title: "Visita técnica sin compromiso", content: "Un técnico revisa tu tejado y tu consumo antes de presupuestar." },
  ];

const Feature02 = () => {
  return (
    <>
      <Feature featureData={featureData} />
    </>
  );
};

export default Feature02;
