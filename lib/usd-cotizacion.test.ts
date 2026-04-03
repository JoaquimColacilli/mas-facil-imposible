import { describe, it, expect } from 'vitest'
import { parseDolarResponse } from './dolar-cotizacion'

const FULL_API_RESPONSE = [
  {
    moneda: 'USD',
    casa: 'oficial',
    nombre: 'Oficial',
    compra: 1050,
    venta: 1090,
    fechaActualizacion: '2026-04-03T14:00:00.000Z',
  },
  {
    moneda: 'USD',
    casa: 'blue',
    nombre: 'Blue',
    compra: 1190,
    venta: 1210,
    fechaActualizacion: '2026-04-03T14:00:00.000Z',
  },
  {
    moneda: 'USD',
    casa: 'bolsa',
    nombre: 'Bolsa',
    compra: 1160,
    venta: 1180,
    fechaActualizacion: '2026-04-03T14:00:00.000Z',
  },
  {
    moneda: 'USD',
    casa: 'contadoconliqui',
    nombre: 'Contado con liquidación',
    compra: 1170,
    venta: 1195,
    fechaActualizacion: '2026-04-03T14:00:00.000Z',
  },
  {
    moneda: 'USD',
    casa: 'tarjeta',
    nombre: 'Tarjeta',
    compra: null,
    venta: 1744,
    fechaActualizacion: '2026-04-03T14:00:00.000Z',
  },
]

describe('parseDolarResponse', () => {
  it('fetch exitoso — retorna MEP y Blue correctamente', () => {
    const result = parseDolarResponse(FULL_API_RESPONSE)

    expect(result).not.toBeNull()
    expect(result!.mep).toEqual({
      compra: 1160,
      venta: 1180,
      fechaActualizacion: '2026-04-03T14:00:00.000Z',
    })
    expect(result!.blue).toEqual({
      compra: 1190,
      venta: 1210,
      fechaActualizacion: '2026-04-03T14:00:00.000Z',
    })
  })

  it('falta blue — retorna null', () => {
    const sinBlue = FULL_API_RESPONSE.filter((d) => d.casa !== 'blue')
    expect(parseDolarResponse(sinBlue)).toBeNull()
  })

  it('falta MEP (bolsa) — retorna null', () => {
    const sinBolsa = FULL_API_RESPONSE.filter((d) => d.casa !== 'bolsa')
    expect(parseDolarResponse(sinBolsa)).toBeNull()
  })

  it('array vacío — retorna null', () => {
    expect(parseDolarResponse([])).toBeNull()
  })

  it('input no es array — retorna null', () => {
    expect(parseDolarResponse(null as any)).toBeNull()
    expect(parseDolarResponse(undefined as any)).toBeNull()
    expect(parseDolarResponse('string' as any)).toBeNull()
    expect(parseDolarResponse(42 as any)).toBeNull()
    expect(parseDolarResponse({} as any)).toBeNull()
  })
})
