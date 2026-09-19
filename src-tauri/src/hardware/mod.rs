//! Adaptadores de hardware real (impresora ITPOS 8012, cajón 3nStar CD350,
//! lector OCBS-LA15, balanza Kretz Report LT).
//!
//! Cada adaptador queda aislado detrás de una interfaz (`PrinterService`,
//! `ScaleService`, etc.) para que el resto del sistema nunca dependa del
//! protocolo concreto de un modelo específico (sección 60 del prompt).
//!
//! IMPORTANTE (secciones 67-68): el adaptador de la balanza Kretz Report LT
//! NO debe implementarse con comandos inventados. Se deja la interfaz lista
//! y el parser se completa recién cuando se cuente con la documentación
//! oficial del protocolo serial/Bluetooth del fabricante.

pub mod escpos;
pub mod printer;
pub mod scale;
