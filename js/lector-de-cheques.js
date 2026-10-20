(function () {
  var obtenerElemento = function (id) {
    return document.getElementById(id);
  };
  var MAXIMO_FILAS = 10;

  /* Ejemplo: los dos cheques de la foto de EL ABASTO. Usá «Vaciar» para empezar de cero. */
  //var rows = [
  //  {
  //    fecha: "2026-10-29",
  //    importe: 759792.63,
  //    banco: "MACRO",
  //    nro: "67975893",
  //    nombre: "CONSTRUCTORA AR S.R.L.",
  //    cuit: "30-71241044-9",
  //    aut: "OK",
  //    rech: "",
  //    adv: ""
  //  },
  //  {
  //    fecha: "2026-11-13",
  //    importe: 759792.63,
  //    banco: "MACRO",
  //    nro: "67975895",
  //    nombre: "CONSTRUCTORA AR S.R.L.",
  //    cuit: "30-71241044-9",
  //    aut: "OK",
  //    rech: "",
  //    adv: ""
  //  }
  //];
  var filas = [];
  var archivosPendientes = [];
  var controladorAborto = null;

  function cargarDeLocalStorage(clave, defecto) {
    try {
      var valor = localStorage.getItem(clave);
      return valor == null ? defecto : valor;
    } catch (e) {
      return defecto;
    }
  }

  function guardarEnLocalStorage(clave, valor) {
    try {
      localStorage.setItem(clave, valor);
    } catch (e) {}
  }

  obtenerElemento("usuario").value = cargarDeLocalStorage("lcels_usuario", "SC") || "SC";
  obtenerElemento("cliente").value = cargarDeLocalStorage("lcels_cliente", "EL ABASTO") || "EL ABASTO";

  obtenerElemento("usuario").addEventListener("input", function () {
    this.value = this.value.toUpperCase();
    guardarEnLocalStorage("lcels_usuario", this.value);
    render();
  });

  obtenerElemento("cliente").addEventListener("input", function () {
    this.value = this.value.toUpperCase();
    guardarEnLocalStorage("lcels_cliente", this.value);
  });

  function obtenerUsuario() {
    return obtenerElemento("usuario").value.trim();
  }

  function obtenerCliente() {
    return obtenerElemento("cliente").value.trim();
  }

  function fechaHoy() {
    var d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function calcularDias(fecha) {
    if (!fecha) return null;
    var partes = fecha.split("-");
    if (partes.length !== 3) return null;
    var d = new Date(+partes[0], +partes[1] - 1, +partes[2]);
    return Math.round((d - fechaHoy()) / 86400000);
  }

  var formatoNumero = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  function formatoDinero(numero) {
    return numero == null || isNaN(numero) ? "" : formatoNumero.format(numero);
  }

  function parsearDinero(texto) {
    texto = String(texto).trim().replace(/[^\d.,-]/g, "");
    if (!texto) return null;
    if (texto.indexOf(",") > -1) {
      texto = texto.replace(/\./g, "").replace(",", ".");
    } else if (!/^\d+\.\d{1,2}$/.test(texto)) {
      texto = texto.replace(/\./g, "");
    }
    var numero = parseFloat(texto);
    return isNaN(numero) ? null : numero;
  }

  function formatoCUIT(texto) {
    var digitos = String(texto || "").replace(/\D/g, "");
    return digitos.length === 11
      ? digitos.slice(0, 2) + "-" + digitos.slice(2, 10) + "-" + digitos.slice(10)
      : String(texto || "");
  }

  /* Dígito verificador del CUIT: sirve para detectar un número mal leído. */
  function verificarCUIT(texto) {
    var digitos = String(texto || "").replace(/\D/g, "");
    if (digitos.length !== 11) return false;
    var pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    var total = 0;
    for (var i = 0; i < 10; i++) total += pesos[i] * (+digitos[i]);
    var verificador = 11 - (total % 11);
    if (verificador === 11) verificador = 0;
    if (verificador === 10) return +digitos[10] === 9 || +digitos[10] === 4;
    return verificador === +digitos[10];
  }

  function renderizar() {
    var cuerpoTabla = obtenerElemento("rows");
    cuerpoTabla.textContent = "";
    var totalImporte = 0;
    var totalNumerales = 0;
    var notas = [];

    if (!filas.length) {
      var tr0 = document.createElement("tr");
      var td0 = document.createElement("td");
      td0.colSpan = 12;
      td0.className = "empty";
      td0.textContent =
        "Todavía no hay cheques. Soltá las fotos arriba y tocá «Leer cheques».";
      tr0.appendChild(td0);
      cuerpoTabla.appendChild(tr0);
    }

    filas.forEach(function (fila, indice) {
      var tr = document.createElement("tr");

      function crearCelda(clase) {
        var td = document.createElement("td");
        if (clase) td.className = clase;
        tr.appendChild(td);
        return td;
      }

      function crearInput(td, tipo, valor, funcion, etiqueta) {
        var elemento = document.createElement("input");
        elemento.type = tipo;
        elemento.value = valor == null ? "" : valor;
        elemento.setAttribute("aria-label", etiqueta + " fila " + (indice + 1));
        elemento.addEventListener("change", function () {
          funcion(elemento.value);
          renderizar();
        });
        td.appendChild(elemento);
        return elemento;
      }

      var diasCalculados = calcularDias(fila.fecha);
      var numerales =
        diasCalculados != null && fila.importe != null
          ? Math.round(diasCalculados * fila.importe * 100) / 100
          : null;

      crearInput(crearCelda("c-fecha"), "date", fila.fecha, function (v) {
        fila.fecha = v;
      }, "Fecha de vencimiento");

      crearInput(crearCelda("num"), "text", formatoDinero(fila.importe), function (v) {
        fila.importe = parsearDinero(v);
      }, "Importe");

      crearInput(crearCelda("c-banco"), "text", fila.banco, function (v) {
        fila.banco = v.trim().toUpperCase();
      }, "Banco");

      crearInput(crearCelda("c-nro"), "text", fila.nro, function (v) {
        fila.nro = v.trim();
      }, "Número de cheque");

      crearInput(crearCelda("c-nombre"), "text", fila.nombre, function (v) {
        fila.nombre = v.trim();
      }, "Nombre del firmante");

      crearInput(crearCelda("c-cuit"), "text", fila.cuit, function (v) {
        fila.cuit = formatoCUIT(v.trim());
      }, "CUIT");

      crearCelda("calc").textContent = diasCalculados == null ? "" : diasCalculados;
      crearCelda("calc").textContent = numerales == null ? "" : formatoDinero(numerales);

      crearInput(crearCelda("c-aut"), "text", fila.aut, function (v) {
        fila.aut = v.trim();
      }, "Autorización");

      crearInput(crearCelda("c-rech"), "text", fila.rech, function (v) {
        fila.rech = v.trim();
      }, "Motivo de rechazo");

      crearCelda("user").textContent = obtenerUsuario();

      var celdaEliminar = crearCelda("x");
      var botonEliminar = document.createElement("button");
      botonEliminar.type = "button";
      botonEliminar.textContent = "×";
      botonEliminar.setAttribute("aria-label", "Quitar fila " + (indice + 1));
      botonEliminar.addEventListener("click", function () {
        filas.splice(indice, 1);
        renderizar();
      });
      celdaEliminar.appendChild(botonEliminar);
      cuerpoTabla.appendChild(tr);

      if (fila.importe != null) totalImporte += fila.importe;
      if (numerales != null) totalNumerales += numerales;

      var descripcionFila = "Fila " + (indice + 1) + (fila.nro ? " (cheque " + fila.nro + ")" : "");
      if (fila.adv) notas.push(descripcionFila + ": " + fila.adv);
      if (fila.cuit && !verificarCUIT(fila.cuit)) {
        notas.push(descripcionFila + ": el CUIT no pasa la verificación, revisalo.");
      }
      if (diasCalculados != null && diasCalculados < 0) {
        notas.push(descripcionFila + ": el cheque ya venció hace " + -diasCalculados + " días.");
      }
    });

    if (filas.length > MAXIMO_FILAS) {
      notas.push(
        "La planilla tiene lugar para " +
          MAXIMO_FILAS +
          " cheques (filas 4 a 13). Quitá " +
          (filas.length - MAXIMO_FILAS) +
          " fila(s) para descargar el Excel."
      );
    }

    var pieTabla = obtenerElemento("foot");
    pieTabla.textContent = "";
    if (filas.length) {
      var ft = document.createElement("tr");
      [
        ["Total", ""],
        [formatoDinero(totalImporte), "calc"],
        ["", ""],
        ["", ""],
        ["", ""],
        ["", ""],
        ["", ""],
        [formatoDinero(totalNumerales), "calc"],
        ["", ""],
        ["", ""],
        ["", ""],
        ["", ""]
      ].forEach(function (c) {
        var td = document.createElement("td");
        td.textContent = c[0];
        if (c[1]) td.className = c[1];
        ft.appendChild(td);
      });
      pieTabla.appendChild(ft);
    }

    var contenedorNotas = obtenerElemento("notes");
    contenedorNotas.textContent = "";
    notas.forEach(function (t) {
      var p = document.createElement("div");
      p.className = "note";
      p.textContent = t;
      contenedorNotas.appendChild(p);
    });

    var resumen = obtenerElemento("summary");
    resumen.textContent = "";
    var promedio = totalImporte ? Math.round(totalNumerales / totalImporte) : null;
    [
      ["Cheques", String(filas.length)],
      ["Importe total", formatoDinero(totalImporte)],
      ["Numerales", formatoDinero(totalNumerales)],
      ["Promedio de cheque en días", promedio == null ? "-" : String(promedio)]
    ].forEach(function (p) {
      var dv = document.createElement("div");
      var sm = document.createElement("small");
      var bb = document.createElement("b");
      sm.textContent = p[0];
      bb.textContent = p[1];
      dv.appendChild(sm);
      dv.appendChild(bb);
      resumen.appendChild(dv);
    });
  }

  /* ---- archivos ---- */
  function agregarArchivos(lista) {
    Array.prototype.forEach.call(lista, function (f) {
      if (!/^image\//.test(f.type)) return;
      archivosPendientes.push({
        file: f,
        url: URL.createObjectURL(f),
        status: "En cola",
        cls: ""
      });
    });
    dibujarArchivos();
  }

  function dibujarArchivos() {
    var ul = obtenerElemento("files");
    ul.textContent = "";
    archivosPendientes.forEach(function (p) {
      var li = document.createElement("li");
      var im = document.createElement("img");
      im.src = p.url;
      im.alt = "";
      var nm = document.createElement("span");
      nm.className = "nm";
      nm.textContent = p.file.name;
      var tg = document.createElement("span");
      tg.className = "tag " + p.cls;
      tg.textContent = p.status;
      li.appendChild(im);
      li.appendChild(nm);
      li.appendChild(tg);
      ul.appendChild(li);
    });
    obtenerElemento("actions").hidden = !archivosPendientes.length;
    obtenerElemento("go").disabled = !archivosPendientes.some(function (p) {
      return p.status === "En cola" || p.cls === "bad";
    });
    obtenerElemento("clean").hidden = !!controladorAborto || !archivosPendientes.some(function (p) {
      return p.cls === "bad";
    });
    obtenerElemento("vaciarfotos").hidden = !!controladorAborto;
  }

  obtenerElemento("file").addEventListener("change", function () {
    agregarArchivos(this.files);
    this.value = "";
  });

  var zonaDrop = obtenerElemento("drop");
  ["dragenter", "dragover"].forEach(function (ev) {
    zonaDrop.addEventListener(ev, function (e) {
      e.preventDefault();
      zonaDrop.classList.add("over");
    });
  });
  ["dragleave", "drop"].forEach(function (ev) {
    zonaDrop.addEventListener(ev, function (e) {
      e.preventDefault();
      zonaDrop.classList.remove("over");
    });
  });
  zonaDrop.addEventListener("drop", function (e) {
    if (e.dataTransfer) agregarArchivos(e.dataTransfer.files);
  });

  /* ---- lectura con Claude ---- */
  var PROMPT = [
    "Las imágenes son fotos de cheques argentinos (puede haber varios cheques en una misma foto, uno debajo del otro, y pueden estar algo inclinados).",
    "Devolvé un objeto por cada cheque, en orden de arriba hacia abajo.",
    "Respondé solo con un arreglo JSON con este formato:",
    '[{"fecha_cobro":"2026-10-29","monto":759792.63,"banco":"MACRO","nro_cheque":"67975893","razon_social":"CONSTRUCTORA AR S.R.L.","cuit":"30-71241044-9","advertencia":""}]',
    "Reglas:",
    "- fecha_cobro: la fecha de pago del cheque (la línea que empieza con «EL», por ejemplo «EL 29 DE OCTUBRE DE 2026», casi siempre escrita a mano). No es la fecha de emisión que va junto a la ciudad («S.M. DE TUCUMAN, 9 de octubre de 2026»). Formato AAAA-MM-DD.",
    "- monto: el número del recuadro del importe (signo $), como número con punto decimal y sin separador de miles.",
    "- Verificá que el monto coincida con el importe escrito en letras. Si no coincide o hay dudas, explicalo en advertencia.",
    "- banco: el banco emisor, según el logo o el texto impreso en el cheque (el logo puede estar girado). Escribilo en mayúsculas y solo con el nombre, por ejemplo MACRO, SANTANDER, GALICIA, CREDICOOP, NACION, PROVINCIA, CIUDAD, HSBC, ICBC, BBVA.",
    "- nro_cheque: el número de serie impreso del cheque (el recuadro negro junto a «SERIE», que se repite en la banda inferior). Solo dígitos.",
    "- cuit y razon_social: los del firmante (titular de la cuenta), impresos debajo de «CTA.», no los del beneficiario de «PÁGUESE A». La razón social es el nombre del titular (por ejemplo CONSTRUCTORA AR S.R.L.), sin la dirección que a veces va en la misma línea. CUIT con formato XX-XXXXXXXX-X, aunque esté impreso sin guiones.",
    "- Si un dato no se lee con claridad, ponelo en null y explicalo en advertencia. No inventes datos."
  ].join("\n");

  var ERR = {
    not_granted: "Hace falta permitir que Claude lea las fotos.",
    rate_limited: "Demasiados pedidos seguidos. Esperá un momento y probá de nuevo.",
    images_unavailable: "Esta vista no puede enviar imágenes a Claude.",
    image_rejected: "No pude leer esa imagen. Probá con otra foto.",
    invalid_json: "No pude interpretar la respuesta. Probá de nuevo con una foto más nítida."
  };

  function normalizar(objeto) {
    var f = /^\d{4}-\d{2}-\d{2}$/.test(objeto.fecha_cobro || "")
      ? objeto.fecha_cobro
      : "";
    var adv = objeto.advertencia || "";
    if (!f) adv = (adv ? adv + " " : "") + "Revisá la fecha de cobro.";
    var nro = objeto.nro_cheque ? String(objeto.nro_cheque).replace(/\D/g, "") : "";
    return {
      fecha: f,
      importe:
        typeof objeto.monto === "number" ? objeto.monto : parsearDinero(objeto.monto || ""),
      banco: objeto.banco ? String(objeto.banco).trim().toUpperCase() : "",
      nro: nro,
      nombre: objeto.razon_social ? String(objeto.razon_social).trim() : "",
      cuit: formatoCUIT(objeto.cuit || ""),
      aut: "",
      rech: "",
      adv: adv
    };
  }

  function claveUnica(fila) {
    return (fila.banco || "") + "|" + (fila.nro || "");
  }

  function extraerDatosDeTexto(texto) {
    var lineas = texto.split('\n');
    var textoCompleto = texto;
    var textoUpper = texto.toUpperCase();
    
    // ========== FECHA DE COBRO ==========
    // Busca "EL" seguido de día, mes y año (puede estar en múltiples líneas)
    var fecha = "";
    var meses = {
      "ENERO": "01", "FEBRERO": "02", "MARZO": "03", "ABRIL": "04",
      "MAYO": "05", "JUNIO": "06", "JULIO": "07", "AGOSTO": "08",
      "SEPTIEMBRE": "09", "OCTUBRE": "10", "NOVIEMBRE": "11", "DICIEMBRE": "12"
    };
    
    // Buscar patrón: "EL" + número + "DE" + mes + año
    var fechaMatch = textoUpper.match(/EL\s+(\d{1,2})\s+(?:DE\s+)?([A-Z]+)\s+(?:DE\s+)?(\d{4})/);
    if (fechaMatch) {
      var dia = fechaMatch[1].padStart(2, '0');
      var mesTexto = fechaMatch[2];
      var anio = fechaMatch[3];
      
      // Buscar el mes en el diccionario
      for (var mesNombre in meses) {
        if (mesTexto.indexOf(mesNombre) !== -1) {
          fecha = anio + "-" + meses[mesNombre] + "-" + dia;
          break;
        }
      }
    }
    
    // Si no encontró con formato texto, buscar formato numérico DD/MM/AAAA o DD-MM-AAAA
    if (!fecha) {
      var fechaNumMatch = textoUpper.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (fechaNumMatch) {
        var dia = fechaNumMatch[1].padStart(2, '0');
        var mes = fechaNumMatch[2].padStart(2, '0');
        var anio = fechaNumMatch[3];
        fecha = anio + "-" + mes + "-" + dia;
      }
    }
    
    // ========== IMPORTE ==========
    // Buscar importe con formato argentino (punto como separador de miles, coma decimal)
    var importe = null;
    // Busca: opcional $, dígitos con puntos como separadores de miles, coma y dos decimales
    var importeMatch = textoCompleto.match(/\$?\s*(\d{1,3}(?:\.\d{3})*,\d{2})\b/);
    if (importeMatch) {
      importe = parsearDinero(importeMatch[1]);
    }
    
    // Si no encontró con coma, buscar número sin formato especial
    if (importe === null) {
      var importeSimpleMatch = textoCompleto.match(/\$?\s*(\d+(?:[.,]\d{2})?)/);
      if (importeSimpleMatch) {
        importe = parsearDinero(importeSimpleMatch[1]);
      }
    }
    
    // ========== BANCO ==========
    var bancos = [
      "BBVA", "MACRO", "GALICIA", "SANTANDER", "FRANCES", "ICBC", 
      "HIPOTECARIO", "SUPERVIELLE", "CIUDAD", "NACION", "PROVINCIA",
      "CHUBUT", "CREDICOOP", "PATAGONIA", "COMAFI", "HSBC", "ITAU"
    ];
    var banco = "";
    for (var i = 0; i < bancos.length; i++) {
      if (textoUpper.indexOf(bancos[i]) !== -1) {
        banco = bancos[i];
        break;
      }
    }
    
    // ========== NÚMERO DE CHEQUE ==========
    // Buscar después de "SERIE" o "N°" o número de 7-8 dígitos
    var nro = "";
    var nroMatch = textoUpper.match(/(?:SERIE|N[°º]?)\s*[:\s]*(\d{7,8})/);
    if (nroMatch) {
      nro = nroMatch[1];
    } else {
      // Buscar secuencia de 7-8 dígitos que probablemente sea el número
      var nroMatchGenerico = textoCompleto.match(/\b(\d{7,8})\b/);
      if (nroMatchGenerico) {
        nro = nroMatchGenerico[1];
      }
    }
    
    // ========== CUIT ==========
    // Formato: XX-XXXXXXXX-X o variantes con guiones o sin ellos
    var cuit = "";
    var cuitMatch = textoCompleto.match(/(\d{2,3})[\s\-]?(\d{8})[\s\-]?(\d{1})/);
    if (cuitMatch) {
      cuit = cuitMatch[1] + "-" + cuitMatch[2] + "-" + cuitMatch[3];
      // Limpiar si tiene 3 dígitos al inicio (algunos tienen el tipo de persona)
      if (cuitMatch[1].length === 3) {
        cuit = cuitMatch[1].substring(1) + "-" + cuitMatch[2] + "-" + cuitMatch[3];
      }
    }
    
    // ========== NOMBRE/RAZÓN SOCIAL ==========
    var nombre = "";
    // Buscar después de palabras clave comunes
    var nombreMatch = textoCompleto.match(/(?:SUC|SUCURSAL|A LA ORDEN DE|PAGUESE A)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ\s\.]{5,60})/i);
    if (nombreMatch) {
      nombre = nombreMatch[1].trim();
      // Limpiar caracteres extraños y limitar longitud
      nombre = nombre.replace(/\s+/g, ' ').substring(0, 50);
    }
    
    // Si no encontró, buscar en líneas que tengan mayoría de letras mayúsculas
    if (!nombre) {
      for (var i = 0; i < lineas.length; i++) {
        var lineaActual = lineas[i].trim();
        // Línea con al menos 10 caracteres, mayoría letras, no tiene muchos números
        if (lineaActual.length >= 10 && 
            /[A-ZÁÉÍÓÚÑ]{5,}/.test(lineaActual) && 
            !/\d{6,}/.test(lineaActual)) {
          nombre = lineaActual.substring(0, 50);
          break;
        }
      }
    }
    
    // ========== VALIDACIÓN ==========
    // Si no encontró ningún dato importante, retornar null
    var datosEncontrados = 0;
    if (fecha) datosEncontrados++;
    if (importe !== null) datosEncontrados++;
    if (banco) datosEncontrados++;
    if (nro) datosEncontrados++;
    
    // DEBUG: Mostrar en consola qué encontró
    console.log("=== DEBUG EXTRACCIÓN ===");
    console.log("Texto OCR completo:", textoCompleto);
    console.log("Datos encontrados:", datosEncontrados);
    console.log("Fecha:", fecha || "NO DETECTADA");
    console.log("Importe:", importe !== null ? importe : "NO DETECTADO");
    console.log("Banco:", banco || "NO DETECTADO");
    console.log("Nro cheque:", nro || "NO DETECTADO");
    console.log("CUIT:", cuit || "NO DETECTADO");
    console.log("Nombre:", nombre || "NO DETECTADO");
    console.log("========================");
    
    if (datosEncontrados < 1) {
      return null;
    }
    
    var advertencia = "";
    if (!fecha) advertencia = "Revisá la fecha de cobro. ";
    if (importe === null) advertencia += "Revisá el importe. ";
    if (!banco) advertencia += "Revisá el banco. ";
    if (!nro) advertencia += "Revisá el número de cheque. ";
    
    return {
      fecha: fecha,
      importe: importe,
      banco: banco,
      nro: nro,
      nombre: nombre,
      cuit: cuit,
      aut: "",
      rech: "",
      adv: advertencia.trim()
    };
  }

  // Función para llamar a Gemini (funciona en local y en Netlify)
  async function analizarChequeConGemini(imageBase64) {
    var esLocal = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (esLocal) {
      // Modo LOCAL: llamar directamente a la API de Gemini
      if (!ENV.GEMINI_API_KEY_LOCAL) {
        throw new Error('Configurá GEMINI_API_KEY_LOCAL en config.js para probar localmente. Obtené tu key GRATIS en: https://aistudio.google.com/app/apikey');
      }
      
      var PROMPT = 'Las imágenes son fotos de cheques argentinos (puede haber varios cheques en una misma foto, uno debajo del otro, y pueden estar algo inclinados).\n' +
        'Devolvé un objeto por cada cheque, en orden de arriba hacia abajo.\n' +
        'Respondé solo con un arreglo JSON con este formato:\n' +
        '[{"fecha_cobro":"2026-10-29","monto":759792.63,"banco":"MACRO","nro_cheque":"67975893","razon_social":"CONSTRUCTORA AR S.R.L.","cuit":"30-71241044-9","advertencia":""}]\n\n' +
        'Reglas:\n' +
        '- fecha_cobro: la fecha de pago del cheque (la línea que empieza con "EL", por ejemplo "EL 29 DE OCTUBRE DE 2026", casi siempre escrita a mano). No es la fecha de emisión que va junto a la ciudad. Formato AAAA-MM-DD.\n' +
        '- monto: el número del recuadro del importe (signo $), como número con punto decimal y sin separador de miles.\n' +
        '- Verificá que el monto coincida con el importe escrito en letras. Si no coincide o hay dudas, explicalo en advertencia.\n' +
        '- banco: el banco emisor, según el logo o el texto impreso en el cheque. Escribilo en mayúsculas y solo con el nombre, por ejemplo MACRO, SANTANDER, GALICIA, CREDICOOP, NACION, PROVINCIA, CIUDAD, HSBC, ICBC, BBVA.\n' +
        '- nro_cheque: el número de serie impreso del cheque (el recuadro negro junto a "SERIE", que se repite en la banda inferior). Solo dígitos.\n' +
        '- cuit y razon_social: los del firmante (titular de la cuenta), impresos debajo de "CTA.", no los del beneficiario de "PÁGUESE A". CUIT con formato XX-XXXXXXXX-X.\n' +
        '- Si un dato no se lee con claridad, ponelo en null y explicalo en advertencia. No inventes datos.';
      
      var response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${ENV.GEMINI_API_KEY_LOCAL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: PROMPT
              },
              {
                inline_data: {
                  mime_type: 'image/png',
                  data: imageBase64
                }
              }
            ]
          }]
        })
      });
      
      if (!response.ok) {
        var errorData = await response.text();
        throw new Error('Error de Gemini API: ' + errorData);
      }
      
      var data = await response.json();
      var textoRespuesta = data.candidates[0].content.parts[0].text;
      var jsonMatch = textoRespuesta.match(/\[[\s\S]*\]/);
      
      if (!jsonMatch) {
        throw new Error('No se pudo extraer JSON de la respuesta');
      }
      
      return JSON.parse(jsonMatch[0]);
      
    } else {
      // Modo NETLIFY: llamar a la función serverless (URL relativa)
      var response = await fetch('/api/analizar-cheque', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageBase64: imageBase64
        })
      });

      if (!response.ok) {
        var errorData = await response.json();
        throw new Error(errorData.error || 'Error en la API');
      }

      var resultado = await response.json();
      return resultado.cheques;
    }
  }

  obtenerElemento("go").addEventListener("click", async function () {
    if (!archivosPendientes.length) {
      obtenerElemento("msg").textContent = "No hay fotos para procesar.";
      return;
    }

    controladorAborto = new AbortController();
    obtenerElemento("go").hidden = true;
    obtenerElemento("stop").hidden = false;
    var agregados = 0;
    var errores = 0;

    for (var i = 0; i < archivosPendientes.length; i++) {
      var p = archivosPendientes[i];
      if (p.status !== "En cola" && p.cls !== "bad") continue;
      if (controladorAborto.signal.aborted) break;

      p.status = "Convirtiendo imagen...";
      p.cls = "warn";
      dibujarArchivos();
      obtenerElemento("msg").textContent = "📸 Foto " + (i + 1) + "/" + archivosPendientes.length + " - Preparando imagen...";

      try {
        // Convertir imagen a base64
        var base64 = await new Promise(function(resolve, reject) {
          var reader = new FileReader();
          reader.onload = function(e) {
            // Extraer solo la parte base64 (sin el prefijo data:image/...)
            var base64String = e.target.result.split(',')[1];
            resolve(base64String);
          };
          reader.onerror = reject;
          reader.readAsDataURL(p.file);
        });

        p.status = "Analizando con IA...";
        dibujarArchivos();
        obtenerElemento("msg").textContent = "🤖 Foto " + (i + 1) + "/" + archivosPendientes.length + " - Gemini está leyendo el cheque...";

        // Llamar a Gemini (auto-detecta si es local o Netlify)
        var chequesDetectados = await analizarChequeConGemini(base64);

        if (chequesDetectados && chequesDetectados.length > 0) {
          // Procesar cada cheque detectado
          chequesDetectados.forEach(function(cheque) {
            var datosNormalizados = normalizar(cheque);
            filas.push(datosNormalizados);
            agregados++;
          });
          
          p.status = "✓ " + chequesDetectados.length + " cheque(s)";
          p.cls = "";
          obtenerElemento("msg").textContent = "✓ Foto " + (i + 1) + " procesada - " + agregados + " cheque(s) agregado(s)";
        } else {
          errores++;
          p.status = "✗ Sin cheques";
          p.cls = "bad";
          obtenerElemento("msg").textContent = "✗ Foto " + (i + 1) + " - No se detectaron cheques en la imagen";
        }
      } catch (e) {
        errores++;
        p.status = "✗ Error";
        p.cls = "bad";
        obtenerElemento("msg").textContent = "✗ Error en foto " + (i + 1) + ": " + (e.message || "Error desconocido");
        console.error("Error procesando imagen:", e);
      }
      
      renderizar();
      dibujarArchivos();
    }

    obtenerElemento("go").hidden = false;
    obtenerElemento("stop").hidden = true;
    controladorAborto = null;
    dibujarArchivos();

    // Mensaje final con resumen
    if (agregados > 0 && errores === 0) {
      obtenerElemento("msg").textContent = "✓ ¡Listo! " + agregados + " cheque(s) procesado(s) con IA. Revisá los datos y descargá el Excel.";
    } else if (agregados > 0 && errores > 0) {
      obtenerElemento("msg").textContent = "⚠ Procesamiento completo: " + agregados + " cheque(s) OK, " + errores + " con error.";
    } else if (errores > 0) {
      obtenerElemento("msg").textContent = "✗ No se pudieron procesar las fotos. Revisá que sean imágenes claras de cheques.";
    }
  });

  obtenerElemento("stop").addEventListener("click", function () {
    archivosPendientes.forEach(function (p) {
      try {
        URL.revokeObjectURL(p.url);
      } catch (e) {}
    });
    archivosPendientes = [];
    controladorAborto = null;
    dibujarArchivos();
  });

  obtenerElemento("vaciarfotos").addEventListener("click", function () {
    archivosPendientes.forEach(function (p) {
      try {
        URL.revokeObjectURL(p.url);
      } catch (e) {}
    });
    archivosPendientes = [];
    obtenerElemento("msg").textContent = "";
    dibujarArchivos();
  });

  obtenerElemento("clean").addEventListener("click", function () {
    archivosPendientes = archivosPendientes.filter(function (p) {
      if (p.cls !== "bad") return true;
      try {
        URL.revokeObjectURL(p.url);
      } catch (e) {}
      return false;
    });
    obtenerElemento("msg").textContent = "";
    dibujarArchivos();
  });

  /* ---- filas ---- */
  obtenerElemento("add").addEventListener("click", function () {
    filas.push({
      fecha: "",
      importe: null,
      banco: "",
      nro: "",
      nombre: "",
      cuit: "",
      aut: "",
      rech: "",
      adv: ""
    });
    renderizar();
  });

  obtenerElemento("clear").addEventListener("click", function () {
    filas = [];
    renderizar();
  });

  /* ---- salidas ---- */
  var TPL =
    "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";

  /* Rellena la planilla NUMERALES_ELS: cheques en filas 4 a 13, cliente en C1, usuario en K. G y H llevan fórmulas. */
  async function fillTemplate(JSZipLib, tplB64, filas, o, todayD) {
    var zip = await JSZipLib.loadAsync(tplB64, { base64: true });
    var xml = await zip.file("xl/worksheets/sheet1.xml").async("string");
    var wbx = await zip.file("xl/workbook.xml").async("string");

    function esc(s) {
      return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }

    function emptyRe(ref) {
      return new RegExp('<c r="' + ref + '"( s="\\d+")?/>');
    }

    function put(ref, kind, val) {
      var re = emptyRe(ref);
      if (!re.test(xml)) throw new Error("celda " + ref);
      xml = xml.replace(re, function (m, s) {
        s = s || "";
        return kind === "s"
          ? '<c r="' +
              ref +
              '"' +
              s +
              ' t="inlineStr"><is><t xml:space="preserve">' +
              esc(val) +
              "</t></is></c>"
          : '<c r="' + ref + '"' + s + "><v>" + val + "</v></c>";
      });
    }

    function putF(ref, formula, val) {
      var re = emptyRe(ref);
      if (!re.test(xml)) throw new Error("celda " + ref);
      xml = xml.replace(re, function (m, s) {
        return (
          '<c r="' +
          ref +
          '"' +
          (s || "") +
          '><f ca="1">' +
          formula +
          "</f><v>" +
          val +
          "</v></c>"
        );
      });
    }

    function cached(ref, val) {
      var re = new RegExp(
        '<c r="' + ref + '"([^>]*)>(<f[^>]*?(?:/>|>.*?</f>))<v>[^<]*</v>'
      );
      if (!re.test(xml)) throw new Error("formula " + ref);
      xml = xml.replace(re, function (m, a, f) {
        return (
          '<c r="' +
          ref +
          '"' +
          a.replace(/ t="\w+"/, "") +
          ">" +
          f +
          "<v>" +
          val +
          "</v>"
        );
      });
    }

    var EPOCH = Date.UTC(1899, 11, 30);
    var t0 = Date.UTC(
      todayD.getFullYear(),
      todayD.getMonth(),
      todayD.getDate()
    );
    cached("A1", Math.round((t0 - EPOCH) / 86400000));

    if (o.cliente) {
      var rc = /<c r="C1"( s="\d+")? t="s"><v>\d+<\/v><\/c>/;
      if (!rc.test(xml)) throw new Error("celda C1");
      xml = xml.replace(rc, function (m, s) {
        return (
          '<c r="C1"' +
          (s || "") +
          ' t="inlineStr"><is><t xml:space="preserve">' +
          esc(o.cliente) +
          "</t></is></c>"
        );
      });
    }

    var tImp = 0;
    var tNum = 0;

    filas.forEach(function (fila, indice) {
      var n = 4 + indice;
      var ser = null;
      var d = null;

      if (fila.fecha) {
        var p = fila.fecha.split("-").map(Number);
        var u = Date.UTC(p[0], p[1] - 1, p[2]);
        ser = Math.round((u - EPOCH) / 86400000);
        d = Math.round((u - t0) / 86400000);
      }

      if (ser != null) put("A" + n, "n", ser);
      if (fila.importe != null) put("B" + n, "n", fila.importe);
      if (fila.banco) put("C" + n, "s", fila.banco);
      if (fila.nro) {
        if (/^[1-9]\d{0,14}$/.test(fila.nro)) put("D" + n, "n", fila.nro);
        else put("D" + n, "s", fila.nro);
      }
      if (fila.nombre) put("E" + n, "s", fila.nombre);
      if (fila.cuit) put("F" + n, "s", fila.cuit);
      if (fila.aut) put("I" + n, "s", fila.aut);
      if (fila.rech) put("J" + n, "s", fila.rech);
      if (o.usuario) put("K" + n, "s", o.usuario);
      tImp += fila.importe || 0;
    });

    tImp = Math.round(tImp * 100) / 100;
    tNum = Math.round(tNum * 100) / 100;
    cached("B15", tImp);
    cached("H15", tNum);
    if (tImp) cached("H17", tNum / tImp);

    zip.file("xl/worksheets/sheet1.xml", xml);
    zip.file(
      "xl/workbook.xml",
      wbx.replace(
        '<calcPr calcId="191028"/>',
        '<calcPr calcId="191028" fullCalcOnLoad="1"/>'
      )
    );
    return zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });
  }

  obtenerElemento("dl").addEventListener("click", async function () {
    var m = obtenerElemento("msg2");
    if (!filas.length) {
      m.textContent = "No hay cheques para exportar.";
      return;
    }
    if (filas.length > MAXIMO_FILAS) {
      m.textContent =
        "Tu planilla tiene lugar para " +
        MAXIMO_FILAS +
        " cheques (filas 4 a 13). Quitá " +
        (filas.length - MAXIMO_FILAS) +
        " fila(s).";
      return;
    }
    try {
      var buf = await fillTemplate(
        JSZip,
        TPL,
        filas,
        { usuario: obtenerUsuario(), cliente: obtenerCliente() },
        fechaHoy()
      );
      var dl = await claude.use("downloads");
      if (!dl) throw { code: "unavailable" };
      var res = await dl.save({ filename: "NUMERALES_ELS.xlsx", data: buf });
      m.textContent =
        res.status === "saved" ? "Excel guardado." : "Excel enviado.";
    } catch (e) {
      m.textContent =
        e && e.code === "unavailable"
          ? "Esta vista no permite descargar. Usá «Copiar columnas A a F»."
          : "No se guardó el archivo.";
    }
  });

  obtenerElemento("copy").addEventListener("click", function () {
    var m = obtenerElemento("msg2");
    var txt = filas
      .map(function (r) {
        var f = r.fecha ? r.fecha.split("-").reverse().join("/") : "";
        return [
          f,
          r.importe == null ? "" : String(r.importe).replace(".", ","),
          r.banco,
          r.nro,
          r.nombre,
          r.cuit
        ].join("\t");
      })
      .join("\n");

    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = txt;
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (e) {}
      ta.remove();
      m.textContent = ok
        ? "Copiado. Pegá en la celda A4."
        : "No pude copiar. Usá «Descargar Excel».";
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(function () {
        m.textContent = "Copiado. Pegá en la celda A4.";
      }, fallback);
    } else {
      fallback();
    }
  });

  renderizar();
})();