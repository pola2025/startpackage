const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function updatePassword() {
  try {
    const user = await prisma.user.findFirst({
      where: { 연락처: '01098979834' }
    });

    if (!user) {
      console.error('❌ 사용자 없음');
      return;
    }

    const hashedPassword = await bcrypt.hash('0102', 10);
    
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    console.log('✅ 비밀번호 변경 완료!');
    console.log('   - 연락처: 01098979834');
    console.log('   - 새 비밀번호: 0102');
    console.log('');
    console.log('🎯 http://localhost:3005 → 01098979834/0102 로그인!');

  } catch (e) {
    console.error('❌', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

updatePassword();
