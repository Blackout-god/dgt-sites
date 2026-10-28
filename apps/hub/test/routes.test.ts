import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/index';
const env:any={LOCAL_DEVELOPMENT:'true',ADMIN_TOKEN:'test-admin',PARTNER_API_KEY:'test-partner',ALLOWED_ORIGINS:'http://localhost:3000',BRAND:'INKATOYS'};
test('internal import and media are protected before database access',async()=>{
  assert.equal((await app.request('/internal/import',{method:'POST'},env)).status,401);
  assert.equal((await app.request('/internal/media/originals/1/1.jpg',{method:'PUT'},env)).status,401);
  assert.equal((await app.request('/internal/status',{headers:{Authorization:'Bearer test-admin'}},{...env,LOCAL_DEVELOPMENT:'false'})).status,403);
});
test('partner API denies missing or invalid keys',async()=>{
  assert.equal((await app.request('/api/v1/products',{},env)).status,401);
  assert.equal((await app.request('/api/v1/products?key=wrong',{},env)).status,401);
});
test('lead form rejects untrusted origin, missing consent and invalid email',async()=>{
  assert.equal((await app.request('/leads',{method:'POST',headers:{Origin:'https://untrusted.example'}},env)).status,403);
  const request=(data:unknown)=>app.request('/leads',{method:'POST',headers:{Origin:'http://localhost:3000','Content-Type':'application/json'},body:JSON.stringify(data)},env);
  assert.equal((await request({name:'Test',email:'bad',company:'Test',country:'UA',consent:true})).status,400);
  assert.equal((await request({name:'Test',email:'valid@example.com',company:'Test',country:'UA',consent:false})).status,400);
});
test('production lead collection stays disabled until delivery and anti-spam are configured',async()=>{
  assert.equal((await app.request('/leads',{method:'POST',headers:{Origin:'http://localhost:3000'}},{...env,LOCAL_DEVELOPMENT:'false'})).status,503);
});
