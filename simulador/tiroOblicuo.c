#include <stdio.h>
#include <stdlib.h>
#include <raylib.h>
#include <math.h>

/* Escenario de tiro oblicuo.
 * Parámetros:
 * y0     -> altura inicial en metros
 * angle  -> ángulo en grados
 * v0     -> velocidad inicial en m/s
 * La simulación pausa cuando la pelota cae al piso.
 */


/*TO DO:
 * Poder ir para atras 
 */
#define G 9.81
float calculatePositionX(float v0x, float t);
float calculatePositionY(float y0, float v0y, float g, float t);

int main(int argc, char *argv[]){
    if (argc < 3) {
        printf("Te faltaron los parametros\n");
        return 1;
    }
    float y0 = atoi(argv[1]);
    float angle = atoi(argv[2]) * M_PI / 180.0;
    float v0 = atoi(argv[3]);
    
    //Para Testear
    /*float y0 = 5;
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

    float t = 0;

    int radius = 20;

    InitWindow(800, 600, "Tiro oblicuo");
    // Tamaño de ventana
    int monitor = GetCurrentMonitor();
    int screenWidth = GetMonitorWidth(monitor);
    int screenHeight = GetMonitorHeight(monitor);
    //Determinar escala 
    float flightTime = (vy + sqrt(vy*vy + 2*G*y0)) / G;
    float maxRange = vx * flightTime;
    float maxHeight = y0 + (vy * vy) / (2 * G);
    float scaleX = (screenWidth - 200) / maxRange;
    float scaleY = (screenHeight - 200) / maxHeight;
    float const SCALE = fmin(scaleX, scaleY);

    SetWindowSize(screenWidth,screenHeight);
    SetWindowPosition(0, 0);
    
    SetTargetFPS(60);

   
    //Origen fisico
    int originX = 100;
    int originY = GetScreenHeight() - 100;
    bool pause = true;
    while (!WindowShouldClose()){
        // PAUSE
        if (IsKeyPressed(KEY_SPACE)) {
            pause = !pause;
        }
        // RESET
        if (IsKeyPressed(KEY_R)) {
            t = 0;
            pause = false;
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
        xScreen = originX + x * SCALE;
        yScreen = originY - y * SCALE;

        if (yScreen >= originY - radius && t >= 0.1f) {
            pause = true;
        }
        BeginDrawing();
            ClearBackground(WHITE);
            DrawText(TextFormat("t = %.2f s", t),20,20,20,BLACK);
            DrawText(TextFormat("x = %.2f m", x),20,50,20,BLACK);
            DrawText(TextFormat("y = %.2f m", y),20,80,20,BLACK);
            // Piso
            DrawLine(0,originY,GetScreenWidth(),originY,BLACK);
            //Pelota
            DrawCircle((int)xScreen,(int)yScreen,radius,RED);
        EndDrawing();
    }

    CloseWindow();
    return 0;
}

float calculatePositionY(float y0,float v0y,float g,float t){
    return y0+ v0y * t- 0.5 * g * t * t;
}

float calculatePositionX(float v0x,float t){
    return v0x * t;
}

