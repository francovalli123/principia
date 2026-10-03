#include <stdio.h>
#include <stdlib.h>
#include <raylib.h>
#include <math.h>
#include <emscripten/emscripten.h>

/* Escenario de tiro oblicuo.
 * Parámetros:
 * y0     -> altura inicial en metros
 * angle  -> ángulo en grados
 * v0     -> velocidad inicial en m/s
 * La simulación pausa cuando la pelota cae al piso.
 */

#define G 9.81

float calculatePositionX(float v0x, float t);
float calculatePositionY(float y0, float v0y, float g, float t);

/* Estado global de la simulación */
float t = 0;
bool pause = true;
bool completed = false;
float simX = 0;
float simY = 0;
float simInitialY = 0;
int simStatus = 0; // 0: pausada, 1: en ejecución, 2: completada

/* Funciones accesibles desde WebAssembly */

EMSCRIPTEN_KEEPALIVE
void pauseSim() {
    if (!completed) {
        pause = !pause;
        simStatus = pause ? 0 : 1;
    }
}


EMSCRIPTEN_KEEPALIVE
void resetSim() {
    t = 0;
    pause = true;
    completed = false;
    simX = 0;
    simY = simInitialY;
    simStatus = 0;
}

EMSCRIPTEN_KEEPALIVE
float getSimTime() {
    return t;
}

EMSCRIPTEN_KEEPALIVE
float getSimX() {
    return simX;
}

EMSCRIPTEN_KEEPALIVE
float getSimY() {
    return simY;
}

EMSCRIPTEN_KEEPALIVE
int getSimStatus() {
    return simStatus;
}

int main(int argc, char *argv[]) {
    if (argc < 4) {
        printf("Te faltaron los parametros\n");
        return 1;
    }

    float y0 = atof(argv[1]);
    float angle = atof(argv[2]) * M_PI / 180.0;
    float v0 = atof(argv[3]);

    simInitialY = y0;

    simX = 0;
    simY = y0;

    // Para testear
    /*
    float y0 = 5;
    float angle = 40 * M_PI / 180;
    float v0 = 20;
    */

    float vx = v0 * cos(angle);
    float vy = v0 * sin(angle);

    // Coordenadas físicas
    float x = 0;
    float y = y0;

    // Coordenadas de pantalla
    float xScreen = 0;
    float yScreen = 0;

    int radius = 20;

    InitWindow(800, 600, "Tiro oblicuo");

    // Tamaño de ventana
    int monitor = GetCurrentMonitor();
    int screenWidth = GetMonitorWidth(monitor);
    int screenHeight = GetMonitorHeight(monitor);

    // Determinar escala
    float flightTime = (vy + sqrt(vy * vy + 2 * G * y0)) / G;
    float maxRange = vx * flightTime;
    float maxHeight = y0 + (vy * vy) / (2 * G);

    float scaleX = (screenWidth - 200) / maxRange;
    float scaleY = (screenHeight - 200) / maxHeight;
    float const SCALE = fmin(scaleX, scaleY);

    SetWindowSize(screenWidth, screenHeight);
    SetWindowPosition(0, 0);

    SetTargetFPS(60);

    // Origen físico
    int originX = 100;
    int originY = GetScreenHeight() - 100;

    while (!WindowShouldClose()) {

        // PAUSE / RESUME
        if (IsKeyPressed(KEY_SPACE)) {
            pauseSim();
        }

        // RESET
        if (IsKeyPressed(KEY_R)) {
            resetSim();
            pause = false;
            simStatus = 1;
        }

        // REWIND
        if (IsKeyDown(KEY_A)) {
            t -= GetFrameTime();

            if (t < 0) {
                t = 0;
            }
        }

        // ADVANCE
        else if (!pause) {
            t += GetFrameTime();
        }

        x = calculatePositionX(vx, t);
        y = calculatePositionY(y0, vy, G, t);
        if (y <= 0 && t >= 0.1f) {
            y = 0;
            pause = true;
            completed = true;
            simStatus = 2;
        }
        simX = x;
        simY = y;

        xScreen = originX + x * SCALE;
        yScreen = originY - y * SCALE;

        BeginDrawing();

        ClearBackground(WHITE);

        DrawText(TextFormat("t = %.2f s", t), 20, 20, 20, BLACK);
        DrawText(TextFormat("x = %.2f m", x), 20, 50, 20, BLACK);
        DrawText(TextFormat("y = %.2f m", y), 20, 80, 20, BLACK);

        // Piso
        DrawLine(0, originY, GetScreenWidth(), originY, BLACK);

        // Pelota
        DrawCircle((int)xScreen, (int)yScreen, radius, RED);

        EndDrawing();
    }

    CloseWindow();

    return 0;
}

float calculatePositionY(float y0, float v0y, float g, float t) {
    return y0 + v0y * t - 0.5 * g * t * t;
}

float calculatePositionX(float v0x, float t) {
    return v0x * t;
}
