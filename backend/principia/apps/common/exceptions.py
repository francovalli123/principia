from rest_framework.views import exception_handler

# Adapta las excepciones de Django a un formato unico (para que todos los mensajes de error tengan el mismo formato)
def api_exception_handler(exc, context):
    response = exception_handler(exc, context)  # Delega primero en el handler estandar de DRF
    if response is None:
        return None # Si DRF no genera una respuesta, devuelve None

    details = response.data
    # Si el error contiene unicamente detail, mueve ese valor a message
    if isinstance(details, dict) and set(details) == {"detail"}:
        message = details["detail"]
    else:
        message = details

    # Devuelve la respuesta original pero con el cuerpo normalizado
    response.data = {
        "status": "error",
        "message": message,
    }
    return response
