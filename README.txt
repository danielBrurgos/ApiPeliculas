Documentación Técnica: CineDaniel Premium
CineDaniel Premium es una plataforma de visualización y gestión de datos cinematográficos que consume la API de TMDB. El sistema está diseñado bajo principios de resiliencia de software y optimización de recursos en el cliente.

Componentes de Ingeniería Implementados
1. Patrón de Diseño: Circuit Breaker (Disyuntor)
Se ha implementado un mecanismo de seguridad para gestionar la comunicación con la API de TMDB. Este componente monitorea la tasa de errores en las peticiones asíncronas.

Estado Cerrado: Funcionamiento normal de las peticiones.

Estado Abierto: Ante fallos consecutivos, el sistema interrumpe las peticiones por un periodo de 30 segundos para evitar el colapso de la interfaz.

Interfaz de Usuario: Un indicador visual en la cabecera cambia de verde a rojo parpadeante para notificar al usuario que se ha activado el modo de resiliencia, cargando automáticamente los datos almacenados en el localStorage.

2. Buscador con Autocompletado y Debounce
Debouncing: El sistema de búsqueda incluye una función de retardo que espera 300ms tras la última pulsación de tecla antes de ejecutar la petición. Esto reduce significativamente el número de llamadas innecesarias a la API.

Sugerencias Dinámicas: Se despliega un menú de autocompletado con los resultados más relevantes mientras el usuario escribe, permitiendo una navegación más ágil.

3. Autenticación y Personalización
Google OAuth 2.0: Integración con Google Identity Services para permitir el inicio de sesión. El sistema extrae de forma segura el nombre y la imagen de perfil del usuario.

Gestión de Favoritos: Persistencia de datos mediante localStorage. Las películas marcadas con la estrella se almacenan localmente, permitiendo su consulta incluso en ausencia de conexión a internet o cuando el Circuit Breaker está activo.

4. Filtrado y Recomendaciones
Filtros Dinámicos: Generación automática de botones de filtrado basados en los géneros oficiales de la API.

Algoritmo de Recomendación: Al seleccionar una película, el sistema realiza una petición secundaria para mostrar contenido similar, fomentando el descubrimiento de nuevos títulos.

Guía de Ejecución
Arquitectura Zero Installation
Este proyecto no requiere comandos de instalación (como npm install) por las siguientes razones:

Dependencias Externas: El framework CSS (Tailwind) y las librerías de iconos (FontAwesome) se importan mediante CDN, eliminando la necesidad de un gestor de paquetes.

Tecnología Nativa: El código está escrito en JavaScript Vanilla (ES6+), el cual es interpretado directamente por cualquier navegador moderno sin necesidad de transpiladores.

Portabilidad: El diseño permite que la aplicación funcione en su totalidad simplemente abriendo el archivo index.html.

Pasos para visualizar:
Descargar el repositorio.

Asegurarse de que index.html y script.js se encuentren en el mismo directorio.

Ejecutar index.html en un navegador.