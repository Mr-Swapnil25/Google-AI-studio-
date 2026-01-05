# Contributing to Anna Bazaar 🌾

First off, thank you for considering contributing to Anna Bazaar! It's people like you that make this platform a great tool for connecting Indian farmers with buyers.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Style Guidelines](#style-guidelines)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our commitment to creating a welcoming and inclusive environment. By participating, you are expected to uphold this standard.

## 🤝 How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title** describing the issue
- **Steps to reproduce** the behavior
- **Expected behavior** vs actual behavior
- **Screenshots** if applicable
- **Environment details** (browser, OS, device)

### 💡 Suggesting Features

Feature suggestions are welcome! Please provide:

- **Clear description** of the feature
- **Use case** explaining why it's needed
- **Potential implementation** ideas (optional)
- **Mockups or wireframes** (optional but helpful)

### 🔧 Code Contributions

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Make your changes
4. Run tests and ensure the build passes
5. Commit your changes (`git commit -m 'Add AmazingFeature'`)
6. Push to the branch (`git push origin feature/AmazingFeature`)
7. Open a Pull Request

## 🛠️ Development Setup

### Prerequisites

```bash
node >= 18.x
npm >= 9.x
```

### Installation

```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/Google-AI-studio-.git
cd Google-AI-studio-

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local
# Fill in your API keys in .env.local

# Start development server
npm run dev
```

### Useful Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## 📝 Pull Request Process

1. **Update documentation** if you're changing functionality
2. **Follow the style guidelines** outlined below
3. **Test your changes** on multiple screen sizes
4. **Write meaningful commit messages** following conventional commits
5. **Link related issues** in your PR description
6. **Request review** from maintainers

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
- `feat(auth): add Google OAuth integration`
- `fix(cart): resolve quantity update bug`
- `docs(readme): update installation steps`

## 🎨 Style Guidelines

### TypeScript

- Use TypeScript for all new files
- Define proper interfaces/types
- Avoid `any` type where possible
- Use meaningful variable names

### React Components

```tsx
// ✅ Good: Functional component with TypeScript
interface ProductCardProps {
  product: Product;
  onAddToCart: (id: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  // ...
};
```

### Styling (Tailwind CSS)

- Use Tailwind utility classes
- Group related classes logically
- Use component extraction for repeated patterns
- Maintain mobile-first approach

```tsx
// ✅ Good: Organized Tailwind classes
<div className="
  flex items-center justify-between
  p-4 rounded-xl
  bg-white shadow-sm
  hover:shadow-md transition-shadow
">
```

### File Organization

```
components/
├── ComponentName/
│   ├── index.tsx          # Main component
│   ├── ComponentName.tsx  # Component implementation
│   ├── types.ts           # Component-specific types
│   └── utils.ts           # Component-specific utilities
```

## 🧪 Testing Guidelines

- Test on Chrome, Firefox, Safari
- Test mobile responsiveness (375px, 768px, 1024px)
- Test with slow network conditions
- Verify Firebase operations complete successfully

## 📚 Resources

- [React Documentation](https://react.dev)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## ❓ Questions?

Feel free to open an issue with the `question` label or reach out to the maintainers.

---

**Thank you for contributing to Anna Bazaar!** 🌾🙏
