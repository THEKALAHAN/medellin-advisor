# README_PRINCIPAL — Medellin Advisors

## REALIZADO POR JUAN PABLO LEAL USUGA
## ESTUDIANTE DE DÉCIMO SEMESTRE DE INGENIERÍA DE SOFTWARE

# Nota:
Este README_PRINCIPAL.md fue realizado para contar mi experiencia durante la creación del proyecto de Medellín Advisors, decisiones que tomé, cómo utilicé herramientas de IA y retos que enfrenté durante el desarrollo.

El README.md es el producto de un prompt, que permitiera explicar más a profundidad el funcionamiento de la web, la instalación y despliegue del proyecto mismo. Por tanto, puede resultar ser más compleja su lectura, por este motivo recomiendo que primero se lea este primer documento.

- [README principal — Historia, decisiones y desarrollo](./README_PRINCIPAL.md)
- [README técnico — Instalación, configuración y funcionamiento](./README_TECNICO.md)

## Sobre el proyecto

Este proyecto tiene el objetivo de modernizar la experiencia de búsqueda de propiedades de **Medellin Advisors**, creando una plataforma inmobiliaria moderna, rápida y fácil de utilizar.

La idea fue construir una experiencia similar a la de plataformas como Airbnb pero sin olvidar la experiencia que ofrece la web de Medellín Advisor. Los usuarios puedan explorar propiedades, consultar su ubicación en un mapa y encontrar opciones mediante filtros de búsqueda.

Más allá de desarrollar una interfaz visualmente atractiva, busqué construir una aplicación que pudiera trabajar con datos reales, ofrecer información organizada y ser comprensible tanto para las personas como para los motores de búsqueda y las herramientas de inteligencia artificial.

## Tecnologías y decisiones

Durante el desarrollo evalué diferentes alternativas y elegí las siguientes tecnologías teniendo en cuenta su rendimiento, facilidad de desarrollo y posibilidades de crecimiento.

- **Next.js 16:** lo elegí como framework principal porque permite combinar renderizado del lado del servidor, optimización y una buena estructura para desarrollar aplicaciones web modernas. También ofrece ventajas para el posicionamiento en buscadores.
- **React 19:** permite construir una interfaz basada en componentes reutilizables, facilitando el mantenimiento y la evolución del proyecto.
- **TypeScript:** lo incorporé para trabajar con tipos de datos definidos, reducir errores y hacer que el código sea más fácil de mantener.
- **Tailwind CSS 4:** lo utilicé para construir y adaptar los estilos de manera rápida, manteniendo consistencia visual y facilitando el diseño responsive.
- **Leaflet:** fue la elección para implementar el mapa interactivo, ya que es una alternativa ligera y flexible que permite mostrar ubicaciones reales y relacionarlas con los resultados de búsqueda.

También se tomó la decisión de utilizar una arquitectura basada en componentes de servidor cuando fuera posible, evitando agregar complejidad innecesaria al navegador.

## Fuente de datos y API

Uno de los principales retos fue encontrar una fuente de información inmobiliaria pública y que permitiera trabajar con datos reales de Medellín.

Después de investigar diferentes alternativas, elegí los servicios geográficos de la **Alcaldía de Medellín mediante ArcGIS REST**, específicamente el servicio relacionado con vivienda y territorio:

https://www.medellin.gov.co/servidormapas/rest/services/vivienda_ciudad_terri

Esta fuente permitió trabajar con información geográfica y registros de propiedades sin depender de una base de datos comercial externa.

A partir de estos datos desarrollé una capa propia de consulta y organización mediante endpoints de Next.js:

- `/api/properties`: permite consultar las propiedades y aplicar filtros de búsqueda.
- `/api/properties/facets`: proporciona información para construir los filtros disponibles.

También fue necesario normalizar los datos originales, adaptar sus formatos y establecer criterios de calidad para evitar mostrar información inconsistente.

El resultado fue una base de **28.357 propiedades incluidas en la capa de datos**, sobre la cual se construyeron las funcionalidades de búsqueda.

## Diseño y experiencia de usuario

Quise alejarme de los diseños inmobiliarios tradicionales y construir una identidad más elegante, moderna y profesional.

La propuesta visual de Medellin Advisors utiliza una estética boutique y editorial, con una paleta basada en tonos marfil, verde profundo, champagne y carbón.

Entre las decisiones de diseño más importantes están:

- Priorizar una experiencia responsive, adaptable a diferentes dispositivos.
- Mantener una interfaz limpia y fácil de entender.
- Sincronizar los resultados de búsqueda con el mapa interactivo.
- Permitir que los filtros y las búsquedas se reflejen en la URL, facilitando compartir y recuperar búsquedas.
- Presentar la información de las propiedades de manera clara y organizada.

Para el mapa se utilizó Leaflet, relacionando las ubicaciones geográficas de los registros con las tarjetas de resultados.

Debido a que la fuente de datos no proporciona fotografías inmobiliarias reales para todas las propiedades, se utilizaron ilustraciones identificadas como tales, evitando presentarlas como fotografías auténticas.

## Retos durante el desarrollo

El proyecto implicó mucho más que conectar una API y construir algunas pantallas. Algunos de los principales retos fueron:

1. **Encontrar y comprender una fuente de datos:** fue necesario investigar los servicios disponibles de la Alcaldía y entender cómo consultar su información mediante ArcGIS REST.
2. **Organizar los datos:** los registros originales requerían normalización, validaciones y criterios para manejar información incompleta o inconsistente.
3. **Construir una búsqueda confiable:** fue necesario trabajar en los filtros, la paginación y las opciones disponibles para evitar resultados incorrectos o inaccesibles.
4. **Integrar el mapa:** relacionar correctamente las coordenadas geográficas con los resultados y mantener sincronizada la experiencia de búsqueda.
5. **Optimizar el rendimiento:** se tuvieron en cuenta aspectos como la caché, el procesamiento de consultas y la preparación para un despliegue en Vercel.
6. **Resolver problemas durante la implementación:** se realizaron pruebas de los endpoints, revisiones de código y correcciones antes de avanzar entre las diferentes etapas.

Estos retos hicieron necesario trabajar de forma progresiva, validando cada parte antes de continuar con la siguiente.

## Uso de inteligencia artificial

Este proyecto fue desarrollado con apoyo de herramientas de inteligencia artificial, principalmente **ChatGPT y Claude Code**.

Mi intención no fue delegar completamente el desarrollo, sino utilizarlas como herramientas de apoyo durante el proceso.

Utilicé ChatGPT para investigar alternativas, comparar tecnologías, organizar la arquitectura, analizar problemas y tomar decisiones técnicas. Por otro lado, utilicé Claude Code integrado en Visual Studio Code para apoyar la implementación, modificar archivos, desarrollar funcionalidades y revisar posibles errores directamente sobre el proyecto.

También fue importante revisar los resultados, ejecutar pruebas, analizar las respuestas de la API y solicitar correcciones cuando algo no funcionaba como esperaba.

La inteligencia artificial aceleró varias etapas del desarrollo, pero las decisiones, la validación de los resultados y la dirección del proyecto formaron parte de mi trabajo.

## Estado y despliegue

El proyecto cuenta con una primera versión funcional de su capa de datos y de la experiencia de búsqueda.

Se realizaron verificaciones de los endpoints, pruebas de parámetros inválidos y validaciones generales del código. También se comprobaron los procesos de compilación y revisión de calidad.

La publicación está realizada en **Vercel**, aprovechando su integración con Next.js y facilitando futuras actualizaciones del proyecto.

## Reflexión final

Este desarrollo representó una oportunidad para llevar a la práctica conocimientos de desarrollo web, integración de servicios externos, manejo de datos, diseño de interfaces y arquitectura de aplicaciones.

Uno de los aprendizajes más importantes fue entender que construir una aplicación no consiste únicamente en escribir código. También implica investigar, comparar alternativas, tomar decisiones, enfrentar problemas y validar constantemente lo que se está desarrollando.

El uso de inteligencia artificial fue un apoyo importante durante todo este proceso, pero también me permitió mejorar mi comprensión de estas herramientas de manera más consciente, entendiendo sus resultados y manteniendo el control sobre las decisiones del proyecto.
