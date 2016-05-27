import { encode, decode } from 'jwt-simple'

const SECRET = 'xxx'
const REQUIRED_CLAIMS = [ 'iss', 'exp' ]
const RECOMMENDED_CLAIMS = [ 'sub', 'aud' ]

const generate = () => {
  const iss = Date.now() / 1000
  const claimsPass = [{ iss, exp: iss + 1 }, { iss, exp: iss + 10 }, { iss, exp: iss + 100 }]

  const claimsFail =  [ { iss, exp: iss - 100 }
                      , { iss: Date.now() / 100, exp: Date.now() / 100 - 1 }
                      , { iss: Date.now() / 10, exp: Date.now() / 10 }
                      , { iss: Date.now() * -1, exp: Date.now() * -1 + 1 }
                      ]


  const jwtPass = claimsPass.map(x => encode(x, SECRET))
  const jwtFail = claimsFail.map(x => encode(x, SECRET))
  const refreshPass = jwtPass.map(x => () => Promise.resolve(x))
  const refreshFail = jwtFail.map(x => () => { throw new Error('BAD REFRESH')})
  const leadSecondsPass = [10, () => 100]
  const leadSecondsFail = [-10, () => -1]
  return { iss, claimsPass, claimsFail, jwtPass, jwtFail, refreshPass, refreshFail, leadSecondsPass, leadSecondsFail }
}

describe('autorefresh', () => {
  const autorefresh = require('../../lib').default
  let data = null
  beforeEach(() => { data = generate() })
  afterEach(() => { data = null })

  it('is a function', () => expect(autorefresh).toEqual(jasmine.any(Function)))
  it('with no params throws', () => expect(() => autorefresh()).toThrow())

  it('with no refresh throws', () => {
    const {leadSecondsPass} = data
    const [leadSeconds] = leadSecondsPass
    expect(() => autorefresh({ leadSeconds })).toThrow()
  })

  it('with no leadSeconds throws', () => {
    const {refreshPass} = data
    const [refresh] = refreshPass
    expect(() => autorefresh({ refresh })).toThrow()
  })

  it('with valid params returns function', () => {
    const {refreshPass, leadSecondsPass} = data
    const [refresh] = refreshPass
    const [leadSeconds] = leadSecondsPass
    expect(autorefresh({ refresh, leadSeconds })).toEqual(jasmine.any(Function))
  })

  it('start thunk with bad refresh throws', () => {
    const {refreshFail, leadSecondsPass, jwtPass} = data
    const [refresh] = refreshFail
    const [leadSeconds] = leadSecondsPass
    const [access_token] = jwtPass
    expect(() => autorefresh({ refresh, leadSeconds })(access_token)).toThrow()
  })

  it('start thunk with bad lead seconds throws', () => {
    const {refreshPass, leadSecondsFail, jwtPass} = data
    const [refresh] = refreshPass
    const [leadSeconds] = leadSecondsFail
    const [access_token] = jwtPass
    expect(() => autorefresh({ refresh, leadSeconds })(access_token)).toThrow()
  })

  it('start thunk throws for invalid token', () => {
    const {refreshPass, leadSecondsPass, jwtFail} = data
    const [refresh] = refreshPass
    const [leadSeconds] = leadSecondsPass
    const [access_token] = jwtFail
    expect(() => autorefresh({ refresh, leadSeconds })(access_token)).toThrow()
  })

  it('start thunk returns cancel function for valid token', () => {
    const {refreshPass, leadSecondsPass, jwtPass} = data
    const [refresh] = refreshPass
    const [leadSeconds] = leadSecondsPass
    const [access_token] = jwtPass
    expect(autorefresh({ refresh, leadSeconds })(access_token)).toEqual(jasmine.any(Function))
  })

  it('start thunk returns cancel function that returns falsy', () => {
    const {refreshPass, leadSecondsPass, jwtPass} = data
    const [refresh] = refreshPass
    const [leadSeconds] = leadSecondsPass
    const [access_token] = jwtPass
    expect(autorefresh({ refresh, leadSeconds })(access_token)()).toBeFalsy()
  })
})
