import {
  deleteAccountSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  verifyCodeSchema,
} from './authSchemas';

function firstError(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues[0]?.message;
}

describe('email', () => {
  it('trims and lower-cases the address', () => {
    const result = signInSchema.parse({ email: '  Lifter@Example.COM ', password: 'x' });
    expect(result.email).toBe('lifter@example.com');
  });

  it('asks for an address when empty', () => {
    expect(firstError(signInSchema.safeParse({ email: '', password: 'x' }))).toBe(
      'Enter your email address.',
    );
  });

  it('rejects something that is not an email', () => {
    expect(firstError(signInSchema.safeParse({ email: 'lifter', password: 'x' }))).toBe(
      'Enter a valid email address.',
    );
  });
});

describe('new password', () => {
  it('needs at least 8 characters', () => {
    expect(firstError(signUpSchema.safeParse({ email: 'a@b.co', password: '1234567' }))).toBe(
      'Use at least 8 characters.',
    );
    expect(signUpSchema.safeParse({ email: 'a@b.co', password: '12345678' }).success).toBe(true);
  });

  it('allows at most 72 characters', () => {
    const tooLong = 'a'.repeat(73);
    expect(firstError(signUpSchema.safeParse({ email: 'a@b.co', password: tooLong }))).toBe(
      'Use 72 characters or fewer.',
    );
  });

  it('keeps spaces in passwords', () => {
    const result = signUpSchema.parse({ email: 'a@b.co', password: ' padded pass ' });
    expect(result.password).toBe(' padded pass ');
  });
});

describe('code', () => {
  it('accepts exactly six digits, ignoring surrounding spaces', () => {
    expect(verifyCodeSchema.parse({ code: ' 123456 ' }).code).toBe('123456');
  });

  it.each(['12345', '1234567', '12345a', ''])('rejects "%s"', (code) => {
    expect(firstError(verifyCodeSchema.safeParse({ code }))).toBe(
      'Enter the 6-digit code from the email.',
    );
  });

  it('is required alongside a valid new password when resetting', () => {
    const result = resetPasswordSchema.safeParse({ code: '123456', password: 'long enough' });
    expect(result.success).toBe(true);
  });
});

describe('delete account', () => {
  it('needs the password', () => {
    expect(firstError(deleteAccountSchema.safeParse({ password: '' }))).toBe(
      'Enter your password.',
    );
  });

  it('accepts any password up to the 72-character limit', () => {
    expect(deleteAccountSchema.safeParse({ password: 'x'.repeat(72) }).success).toBe(true);
    expect(deleteAccountSchema.safeParse({ password: 'x'.repeat(73) }).success).toBe(false);
  });
});
