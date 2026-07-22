import structuralTube from './structural-tube.js';
import angle from './angle.js';
import channel from './channel.js';
import cChannel from './c-channel.js';
import hBeam from './h-beam.js';
import iBeam from './i-beam.js';

export const materialCatalog = [structuralTube, angle, channel, cChannel, hBeam, iBeam];

export function findSpec(shapeId, material, spec) {
  const shape = materialCatalog.find(item => item.id === shapeId);
  return shape?.materials[material]?.find(item => item.spec === spec) ?? null;
}
