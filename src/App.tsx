import { useEffect, useState, type ReactNode } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "@/components/Layout";
import RutaProtegidaPorRol from "@/components/RutaProtegidaPorRol";
import PantallaSplash from "@/components/PantallaSplash";
import PantallaLogin from "@/features/auth/PantallaLogin";
import PantallaAperturaCaja from "@/features/caja/PantallaAperturaCaja";
import PantallaCierreCaja from "@/features/caja/PantallaCierreCaja";
import PantallaCaja from "@/features/caja/PantallaCaja";
import PantallaVenta from "@/features/ventas/PantallaVenta";
import PantallaProductos from "@/features/productos/PantallaProductos";
import PantallaDescuentos from "@/features/productos/PantallaDescuentos";
import PantallaPromociones from "@/features/promociones/PantallaPromociones";
import PantallaDashboard from "@/features/reportes/PantallaDashboard";
import PantallaRentabilidad from "@/features/reportes/PantallaRentabilidad";
import PantallaConfiguracion from "@/features/configuracion/PantallaConfiguracion";
import PantallaLicencia from "@/features/licencia/PantallaLicencia";
import PantallaPrimerInicio from "@/features/setup/PantallaPrimerInicio";
import PantallaAuditoria from "@/features/auditoria/PantallaAuditoria";
import PantallaHistorialVentas from "@/features/ventas/PantallaHistorialVentas";
import { estadoLicenciaSimple, type EstadoLicenciaSimple } from "@/services/licenciaSimpleService";
import { useSesionStore } from "@/store/sesionStore";

function RutaProtegida({ children }: { children: ReactNode }) {
  const usuario = useSesionStore((s) => s.usuario);
  if (!usuario) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function BloqueoLicencia({ vence }: { vence: string }) {
  const formatoFecha = new Intl.DateTimeFormat("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center space-y-4 border-4 border-red-500">
        <span className="text-6xl">🔴</span>
        <h1 className="text-2xl font-black text-red-700">SISTEMA BLOQUEADO</h1>
        <p className="text-slate-600">
          La licencia de este sistema venció el{" "}
          <b>{formatoFecha.format(new Date(vence))}</b>.
        </p>
        <p className="text-slate-600">Para reactivar el servicio, comunicate con:</p>
        <div className="bg-slate-100 rounded-lg p-4 space-y-1">
          <p className="font-bold text-lg text-slate-800">HL Sistemas</p>
          <p className="text-slate-600">Soluciones de Software Innovadoras</p>
          <p className="font-bold text-slate-800">📞 3777 391898</p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [splashVisible, setSplashVisible] = useState(true);
  const [licencia, setLicencia] = useState<EstadoLicenciaSimple | null>(null);

  useEffect(() => {
    estadoLicenciaSimple()
      .then(setLicencia)
      .catch(() => setLicencia(null));
  }, []);

  if (licencia && !licencia.activa) {
    return <BloqueoLicencia vence={licencia.vence_en} />;
  }

  return (
    <>
      {splashVisible && (
        <PantallaSplash onTerminar={() => setSplashVisible(false)} />
      )}

      <HashRouter>
        <Routes>
          <Route path="/primer-inicio" element={<PantallaPrimerInicio />} />
          <Route path="/login" element={<PantallaLogin />} />
          <Route
            path="/apertura-caja"
            element={
              <RutaProtegida>
                <PantallaAperturaCaja />
              </RutaProtegida>
            }
          />
          <Route
            element={
              <RutaProtegida>
                <Layout />
              </RutaProtegida>
            }
          >
            <Route path="/venta" element={<RutaProtegidaPorRol ruta="/venta"><PantallaVenta /></RutaProtegidaPorRol>} />
            <Route path="/productos" element={<RutaProtegidaPorRol ruta="/productos"><PantallaProductos /></RutaProtegidaPorRol>} />
            <Route path="/descuentos" element={<RutaProtegidaPorRol ruta="/descuentos"><PantallaDescuentos /></RutaProtegidaPorRol>} />
            <Route path="/promociones" element={<RutaProtegidaPorRol ruta="/promociones"><PantallaPromociones /></RutaProtegidaPorRol>} />
            <Route path="/dashboard" element={<RutaProtegidaPorRol ruta="/dashboard"><PantallaDashboard /></RutaProtegidaPorRol>} />
            <Route path="/rentabilidad" element={<RutaProtegidaPorRol ruta="/rentabilidad"><PantallaRentabilidad /></RutaProtegidaPorRol>} />
            <Route path="/caja" element={<RutaProtegidaPorRol ruta="/caja"><PantallaCaja /></RutaProtegidaPorRol>} />
            <Route path="/auditoria" element={<RutaProtegidaPorRol ruta="/auditoria"><PantallaAuditoria /></RutaProtegidaPorRol>} />
            <Route path="/historial-ventas" element={<RutaProtegidaPorRol ruta="/historial-ventas"><PantallaHistorialVentas /></RutaProtegidaPorRol>} />
            <Route path="/configuracion" element={<RutaProtegidaPorRol ruta="/configuracion"><PantallaConfiguracion /></RutaProtegidaPorRol>} />
            <Route path="/licencia" element={<RutaProtegidaPorRol ruta="/licencia"><PantallaLicencia /></RutaProtegidaPorRol>} />
            <Route path="/cierre-caja" element={<RutaProtegidaPorRol ruta="/cierre-caja"><PantallaCierreCaja /></RutaProtegidaPorRol>} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </HashRouter>
    </>
  );
}
