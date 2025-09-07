export class Pointer {
  id: number = -1;
  texcoordX: number = 0;
  texcoordY: number = 0;
  prevTexcoordX: number = 0;
  prevTexcoordY: number = 0;
  deltaX: number = 0;
  deltaY: number = 0;
  down: boolean = false;
  moved: boolean = false;
  color: { r: number; g: number; b: number } = { r: 30, g: 0, b: 300 };

  constructor(init?: Partial<Pointer>) {
    Object.assign(this, init);
  }
}
