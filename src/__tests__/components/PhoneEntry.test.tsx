import React, { useState } from 'react'
import { render, screen, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
// load the matchers and their TypeScript types
import '@testing-library/jest-dom'
import PhoneEntry from '../../components/PhoneEntry'

// Helper: render with a controlled parent so we can observe value changes
function Harness({ initial = '' }: { initial?: string }) {
  const [val, setVal] = useState(initial)
  return (
    <div>
      <div data-testid="value">{val}</div>
      <PhoneEntry value={val} onChange={setVal} />
    </div>
  )
}

// Open the MUI <Select> and choose a menu item by its visible text
async function chooseCountry(visibleText: RegExp | string) {
  // The rendered "button" that shows the selected country is labelled by the <InputLabel>
  const countrySelectButton = screen.getByLabelText(/country/i)
  await userEvent.click(countrySelectButton)

  // The listbox is rendered in a portal (document.body)
  const listbox = await screen.findByRole('listbox')
  const option = within(listbox).getByText(visibleText)
  await userEvent.click(option)
}

describe('<PhoneEntry />', () => {
  test('renders and defaults to US', () => {
    render(<Harness />)
    const countryButton = screen.getByLabelText(/country/i)
    // MUI Select button shows the selected option text; default should include (+1) United States
    expect(countryButton).toHaveTextContent(/\(\+1\)\s*United States/i)
  })

  test('user can select United Kingdom and it sticks while typing', async () => {
    render(<Harness />)
    // Pick UK
    await chooseCountry(/\(\+44\)\s*United Kingdom/i)

    // Type a UK mobile number (digits only; component strips non-digits anyway)
    const phoneInput = screen.getByLabelText(/phone number/i)
    await userEvent.type(phoneInput, '7393111111') // 10 digits after leading 7

    // Selection should remain UK
    const countryButton = screen.getByLabelText(/country/i)
    expect(countryButton).toHaveTextContent(/\(\+44\)\s*United Kingdom/i)

    // Value passed up should be +44-prefixed
    const valueEcho = screen.getByTestId('value')
    expect(valueEcho.textContent).toMatch(/^\+447393111111$/)
  })

  test('initial E.164 value sets country/number', async () => {
    render(<Harness initial="+447393111111" />)

    // Country should reflect +44
    const countryButton = screen.getByLabelText(/country/i)
    expect(countryButton).toHaveTextContent(/\(\+44\)\s*United Kingdom/i)

    // onChange echoes back normalized value (effect runs on mount)
    const valueEcho = screen.getByTestId('value')
    expect(valueEcho.textContent).toBe('+447393111111')
  })

  test('typing non-digits is sanitized and value still combines dial code + digits', async () => {
    render(<Harness />)

    // Stay on default US, type with formatting characters
    const phoneInput = screen.getByLabelText(/phone number/i)
    await userEvent.type(phoneInput, '(415) 555-1212')

    const valueEcho = screen.getByTestId('value')
    // Should drop non-digits and include +1
    expect(valueEcho.textContent).toBe('+14155551212')
  })

  test('required field shows error when empty', async () => {
    // Inline wrapper to set required
    function ReqHarness() {
      const [val, setVal] = useState('')
      return <PhoneEntry value={val} onChange={setVal} required />
    }

    render(<ReqHarness />)
    // Error is shown immediately when required and empty
    expect(await screen.findByText(/phone number is required/i)).toBeInTheDocument()
  })

  test('user-picked country is not overridden by subsequent value changes (fix for “reverts to USA”)', async () => {
    function ChangingHarness() {
      const [val, setVal] = useState('')
      return (
        <>
          <div data-testid="value">{val}</div>
          <button onClick={() => setVal('+11234567890')}>Set US Value</button>
          <PhoneEntry value={val} onChange={setVal} />
        </>
      )
    }

    render(<ChangingHarness />)

    // User explicitly picks UK first
    await chooseCountry(/\(\+44\)\s*United Kingdom/i)

    // Now the parent changes the value prop to a US number (previous bug would reset to US)
    await userEvent.click(screen.getByRole('button', { name: /set us value/i }))

    // Country must remain United Kingdom (user-picked sticky behavior)
    const countryButton = screen.getByLabelText(/country/i)
    expect(countryButton).toHaveTextContent(/\(\+44\)\s*United Kingdom/i)
  })

  test('switching countries updates dial code of emitted value', async () => {
    render(<Harness />)

    // Type some digits
    const phoneInput = screen.getByLabelText(/phone number/i)
    await userEvent.type(phoneInput, '7393111111')

    // Default US emission
    let valueEcho = screen.getByTestId('value')
    expect(valueEcho.textContent).toBe('+17393111111')

    // Change to UK and ensure new +44 is used
    await chooseCountry(/\(\+44\)\s*United Kingdom/i)
    valueEcho = screen.getByTestId('value')
    expect(valueEcho.textContent).toBe('+447393111111')
  })

  test('disabled state prevents interactions', async () => {
    function DisabledHarness() {
      const [val, setVal] = useState('')
      return <PhoneEntry value={val} onChange={setVal} disabled />
    }
    render(<DisabledHarness />)

    const countryButton = screen.getByLabelText(/country/i)
    const phoneInput = screen.getByLabelText(/phone number/i)

    expect(countryButton).toHaveAttribute('aria-disabled', 'true')
    expect(phoneInput).toBeDisabled()
  })
})
