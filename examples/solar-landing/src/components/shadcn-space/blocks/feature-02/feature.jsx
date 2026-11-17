import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Asterisk } from "lucide-react";
import { motion } from "motion/react";

const Feature = ({
  featureData
}) => {
  return (
    <section>
      <div className="lg:py-20 sm:py-16 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <div className="flex flex-col gap-8 md:gap-16">
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.8,
                ease: [0.21, 0.47, 0.32, 0.98],
              }}
              className="flex flex-col items-center justify-center gap-4 max-w-lg mx-auto"
            >
              <Badge variant={"outline"} className="px-3 py-1 h-auto text-sm">
                Beneficios
              </Badge>
              <h2 className="text-3xl md:text-4xl font-semibold text-center tracking-[-1px]">
                Qué ganas con una instalación bien hecha
              </h2>
            </motion.div>
            <motion.div
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.1,
                  },
                },
              }}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {featureData.map((value, index) => {
                return (
                  <motion.div
                    key={index}
                    variants={{
                      hidden: { opacity: 0, y: 30, filter: "blur(4px)" },
                      show: { opacity: 1, y: 0, filter: "blur(0px)" },
                    }}
                    transition={{
                      duration: 0.8,
                      ease: [0.21, 0.47, 0.32, 0.98],
                    }}
                  >
                    <Card className="py-10 h-full border-t-4 border-t-transparent transition-all duration-300 hover:border-t-primary hover:shadow-lg">
                      <CardContent className="px-8 flex flex-col gap-6">
                        <value.icon
                          className="w-8 h-8 text-primary"
                          strokeWidth={1.2}
                        />
                        <div className="flex flex-col gap-3">
                          <h6 className="text-xl font-semibold">
                            {value.title}
                          </h6>
                          <p className="text-base font-normal text-muted-foreground">
                            {value.content}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.8,
                ease: [0.21, 0.47, 0.32, 0.98],
              }}
              className="flex flex-col items-center justify-center gap-5"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <Asterisk size={16} />
                <p className="font-normal text-sm">
                  Tres ventajas que notas en la factura y en la visita
                </p>
              </div>
              <Button className="rounded-full px-5 py-2.5 shadow-xs h-full cursor-pointer">
                <a href="/presupuesto">Pedir presupuesto</a>
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Feature;
