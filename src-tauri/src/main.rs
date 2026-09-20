#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod backup;
mod commands;
mod database;
mod excel;
mod hardware;
mod licencia;
mod updater;
mod mercadopago;
mod seguridad;

use database::DbPool;
use tauri::Manager;

fn main() {
    env_logger::init();

    tauri::Builder::default()
        .setup(|app| {
            let ruta_datos = app
                .path_resolver()
                .app_data_dir()
                .expect("no se pudo resolver el directorio de datos de la app");

            let pool: DbPool = database::iniciar_base_de_datos(&ruta_datos)
                .expect("no se pudo inicializar mercado.db â€” revisar logs/app.log");

            app.manage(pool);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::productos::buscar_producto_por_codigo,
            commands::productos::buscar_productos_por_texto,
            commands::productos::crear_producto,
            commands::productos::actualizar_precio_producto,
            commands::productos::desactivar_producto,
            commands::productos::aplicar_descuento_producto,
            commands::productos::quitar_descuento_producto,
            commands::productos::listar_productos_filtrado,
            commands::productos::actualizar_producto,
            commands::productos::reactivar_producto,
            commands::stock::listar_stock_bajo,
            commands::stock::ajustar_stock_manual,
            commands::caja::obtener_caja_abierta,
            commands::caja::abrir_caja,
            commands::caja::registrar_movimiento_caja,
            commands::caja::calcular_resumen_cierre,
            commands::caja::cerrar_caja,
            commands::caja::listar_movimientos_caja,
            commands::caja::listar_cierres_anteriores,
            commands::ventas::confirmar_venta,
            commands::ventas::listar_ventas_para_anular,
            commands::ventas::anular_venta,
            commands::devoluciones::buscar_venta_para_devolucion,
            commands::devoluciones::registrar_devolucion,
            commands::promociones::calcular_promocion_linea,
            commands::promociones::listar_promociones,
            commands::promociones::crear_promocion,
            commands::reportes::obtener_resumen_dashboard,
            commands::reportes::obtener_productos_mas_vendidos,
            commands::reportes::obtener_totales_por_metodo_pago,
            commands::reportes::obtener_ventas_por_dia,
            commands::reportes::obtener_ganancia_periodo,
            commands::reportes::obtener_ganancia_por_producto,
            commands::usuarios::iniciar_sesion,
            commands::usuarios::usuario_tiene_permiso,
            commands::usuarios::crear_usuario,
            commands::usuarios::verificar_autorizacion,
            commands::usuarios::listar_usuarios,
            commands::usuarios::contar_usuarios,
            commands::usuarios::inicializar_sistema,
            commands::usuarios::listar_roles,
            commands::usuarios::cambiar_password_usuario,
            commands::usuarios::toggle_activo_usuario,
            commands::backup::crear_backup,
            commands::auditoria::listar_auditoria,
            commands::auditoria::listar_acciones_auditoria,
            commands::backup::listar_backups,
            commands::licencia::verificar_estado_licencia,
            commands::licencia::estado_licencia_simple,
            commands::licencia::activar_licencia_30_dias,
            commands::updater::verificar_actualizacion,
            commands::updater::descargar_e_instalar_actualizacion,
            commands::compras::listar_proveedores,
            commands::compras::crear_proveedor,
            commands::compras::historial_compras_proveedor,
            commands::compras::confirmar_compra,
            commands::excel::validar_importacion_excel,
            commands::excel::confirmar_importacion_excel,
            commands::excel::exportar_productos_excel,
            commands::configuracion::obtener_configuracion,
            commands::configuracion::guardar_configuracion,
            commands::configuracion::probar_impresora_ethernet,
            commands::configuracion::estado_impresora_ethernet,
            commands::configuracion::abrir_cajon_ethernet,
            commands::configuracion::abrir_cajon_usb,
            commands::configuracion::imprimir_ticket_ethernet,
            commands::configuracion::imprimir_ticket_usb,
            commands::configuracion::imprimir_lista_reposicion_ethernet,
            commands::configuracion::imprimir_lista_reposicion_usb,
            commands::configuracion::imprimir_presupuesto_ethernet,
            commands::configuracion::imprimir_presupuesto_usb,
            commands::configuracion::probar_impresora_usb,
            commands::configuracion::detectar_puertos_balanza,
            commands::mercadopago::guardar_config_mercadopago,
            commands::mercadopago::obtener_config_mercadopago,
            commands::mercadopago::crear_qr_mercadopago,
            commands::mercadopago::verificar_pago_mercadopago,
            commands::mercadopago::verificar_transferencia_por_alias,
            commands::ventas_suspendidas::suspender_venta,
            commands::ventas_suspendidas::listar_ventas_suspendidas,
            commands::ventas_suspendidas::recuperar_venta_suspendida,
            commands::ventas_suspendidas::eliminar_venta_suspendida,
            commands::stock::listar_productos_vencidos,
            commands::stock::listar_productos_proximos_vencer,
            commands::stock::contar_alertas_stock,
        ])
        .run(tauri::generate_context!())
        .expect("error ejecutando la aplicaciÃ³n Tauri");
}




