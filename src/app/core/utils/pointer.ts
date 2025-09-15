import { Pointer } from '@app/core/models/Pointer';
import { generateColor } from '@app/core/services/helpers';

export function updatePointerDownData(
  gl: WebGL2RenderingContext,
  pointer: Pointer,
  id: number,
  posX: number,
  posY: number
) {
  pointer.id = id;
  pointer.down = true;
  pointer.moved = false;
  pointer.texcoordX = posX / gl.canvas.width;
  pointer.texcoordY = 1.0 - posY / gl.canvas.height;
  pointer.prevTexcoordX = pointer.texcoordX;
  pointer.prevTexcoordY = pointer.texcoordY;
  pointer.deltaX = 0;
  pointer.deltaY = 0;
  pointer.color = generateColor();
}

export function updatePointerMoveData(gl: WebGL2RenderingContext, pointer: Pointer, posX: number, posY: number) {
  pointer.prevTexcoordX = pointer.texcoordX;
  pointer.prevTexcoordY = pointer.texcoordY;
  pointer.texcoordX = posX / gl.canvas.width;
  pointer.texcoordY = 1.0 - posY / gl.canvas.height;
  pointer.deltaX = correctDeltaX(gl, pointer.texcoordX - pointer.prevTexcoordX);
  pointer.deltaY = correctDeltaY(gl, pointer.texcoordY - pointer.prevTexcoordY);
  pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
}

export function correctDeltaX(gl: WebGL2RenderingContext, delta: number) {
  let aspectRatio = gl.canvas.width / gl.canvas.height;
  if (aspectRatio < 1) delta *= aspectRatio;
  return delta;
}

export function correctDeltaY(gl: WebGL2RenderingContext, delta: number) {
  let aspectRatio = gl.canvas.width / gl.canvas.height;
  if (aspectRatio > 1) delta /= aspectRatio;
  return delta;
}

export function updatePointerUpData(pointer: Pointer) {
  pointer.down = false;
}
