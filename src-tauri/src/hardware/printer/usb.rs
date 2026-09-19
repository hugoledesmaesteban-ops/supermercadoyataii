//! Impresión por USB en Windows usando la API WinSpool.

use super::PrinterError;
use std::ffi::OsStr;
use std::os::windows::ffi::OsStrExt;
use std::ptr;

use winapi::um::winspool::{
    ClosePrinter, EndDocPrinter, EndPagePrinter, OpenPrinterW, StartDocPrinterW,
    StartPagePrinter, WritePrinter, DOC_INFO_1W,
};

pub fn enviar_a_impresora_usb(nombre_impresora: &str, datos: &[u8]) -> Result<(), PrinterError> {
    let nombre_wide: Vec<u16> = OsStr::new(nombre_impresora)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    unsafe {
        let mut handle = ptr::null_mut();
        if OpenPrinterW(
            nombre_wide.as_ptr() as *mut u16,
            &mut handle,
            ptr::null_mut(),
        ) == 0
        {
            return Err(PrinterError::Conexion(format!(
                "No se pudo abrir la impresora '{}'.",
                nombre_impresora
            )));
        }

        let doc_name: Vec<u16> = "Ticket POS\0".encode_utf16().collect();
        let datatype: Vec<u16> = "RAW\0".encode_utf16().collect();
        let mut doc_info = DOC_INFO_1W {
            pDocName: doc_name.as_ptr() as *mut u16,
            pOutputFile: ptr::null_mut(),
            pDatatype: datatype.as_ptr() as *mut u16,
        };

        if StartDocPrinterW(handle, 1, &mut doc_info as *mut _ as *mut _) == 0 {
            ClosePrinter(handle);
            return Err(PrinterError::Conexion(
                "No se pudo iniciar el trabajo de impresión.".into(),
            ));
        }

        if StartPagePrinter(handle) == 0 {
            EndDocPrinter(handle);
            ClosePrinter(handle);
            return Err(PrinterError::Conexion("No se pudo iniciar la página.".into()));
        }

        let mut escrito: u32 = 0;
        let ok = WritePrinter(
            handle,
            datos.as_ptr() as *mut _,
            datos.len() as u32,
            &mut escrito,
        );

        let _ = EndPagePrinter(handle);
        let _ = EndDocPrinter(handle);
        let _ = ClosePrinter(handle);

        if ok == 0 || escrito as usize != datos.len() {
            return Err(PrinterError::Conexion(
                "No se pudieron enviar todos los bytes a la impresora.".into(),
            ));
        }
    }

    Ok(())
}
