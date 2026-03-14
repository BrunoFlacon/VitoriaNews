export async function publishFacebook(content: any,media: any,connection: { page_id: any; access_token: any }){

const res=await fetch(`https://graph.facebook.com/v21.0/${connection.page_id}/feed`,{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
message:content,
access_token:connection.access_token
})
})

const data=await res.json()

if(data.error){

return{
success:false,
error:data.error.message
}

}

return{
success:true,
postId:data.id
}

}